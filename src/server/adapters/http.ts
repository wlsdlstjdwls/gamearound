// 어댑터 공통 HTTP 계층.
// 6개 어댑터가 거의 같은 fetchJson 을 각자 들고 있었고, 타임아웃, UA, 재시도 판정이 조금씩 어긋나 있었다
// (같은 429 인데 어떤 소스는 retryable, 어떤 소스는 아니었다). 판정은 여기 한 곳에서만 한다.
// 어댑터는 "무엇을 어떤 헤더로 요청할지"만 정하고, 실패를 AdapterError 로 바꾸는 일은 이 파일이 맡는다.
import { AdapterError, CRAWLER_USER_AGENT, type Source } from "./types";
import { runCurl } from "./curl";

export const DEFAULT_TIMEOUT_MS = 15_000;

/**
 * 재시도해볼 만한 상태 코드 — 429(과요청)와 5xx(서버 장애).
 * 4xx 는 요청 자체가 틀린 것이라 같은 요청을 반복해도 결과가 같다.
 */
export function isRetryableStatus(status: number): boolean {
  return status === 429 || status >= 500;
}

export interface HttpClientOptions {
  source: Source;
  /** 에러 메시지 접두 — 로그에서 소스를 한눈에 구분한다 ("Steam", "Xbox") */
  label: string;
  timeoutMs?: number;
  /**
   * 공통 헤더. 요청마다 값이 달라지거나(예: Xbox 의 MS-CV) 환경변수 확인이 필요하면(OpenCritic 키)
   * 함수로 준다 — 함수가 던진 AdapterError 는 그대로 전파된다.
   */
  headers?: HeadersInit | (() => HeadersInit);
  /**
   * 소스별 상태 코드 해석. AdapterError 를 반환하면 그 에러를 던지고, undefined 면 기본 규칙을 쓴다.
   * "404 = 게임 없음" 처럼 소스마다 의미가 다른 코드를 여기서 설명한다.
   */
  onStatus?: (status: number, ctx: string) => AdapterError | undefined;
  /**
   * 전송기. 기본은 fetch 다.
   * "curl" 은 Node 의 TLS 지문 자체가 막히는 소스에만 쓴다 — 이유와 실측은 adapters/curl.ts 상단에 있다.
   * 프로세스를 띄우는 값비싼 경로라 막히지 않는 소스가 쓰면 손해만 본다.
   */
  transport?: "fetch" | "curl";
}

export interface RequestOptions extends RequestInit {
  /** 에러 메시지에 넣을 식별자. 기본값은 URL — id 나 피드명이 더 읽기 쉬우면 넘긴다 */
  context?: string;
}

export interface HttpClient {
  /** JSON 응답. 상태 코드, 파싱 실패 모두 AdapterError 로 바뀐다 */
  json(url: string, opts?: RequestOptions): Promise<unknown>;
  /** 텍스트(HTML, XML) 응답 */
  text(url: string, opts?: RequestOptions): Promise<string>;
  /**
   * 상태 코드를 호출부가 직접 다뤄야 하는 흐름용 — 상태 검사 없이 Response 를 준다.
   * (HLTB 는 403 을 "토큰 만료"로 읽고 재발급 후 재시도한다)
   */
  raw(url: string, opts?: RequestOptions): Promise<Response>;
}

const errMsg = (e: unknown): string => (e instanceof Error ? e.message : String(e));

function mergeHeaders(base: HeadersInit | undefined, accept: string, extra: HeadersInit | undefined): Headers {
  const h = new Headers(base);
  if (!h.has("User-Agent")) h.set("User-Agent", CRAWLER_USER_AGENT);
  if (!h.has("Accept")) h.set("Accept", accept);
  new Headers(extra).forEach((v, k) => h.set(k, v));
  return h;
}

/**
 * 선언한 순서, 대소문자 그대로의 헤더 목록.
 * Headers 는 이름을 소문자로 바꾸고 알파벳순으로 정렬해 버리는데, **그 순서 자체가 지문이 된다** —
 * 같은 값을 정렬된 순서로 보내면 Epic 앞단의 Cloudflare 가 403 을 주고, 선언 순서 그대로면 200 이다(2026-09-14 실측).
 * 그래서 curl 경로는 Headers 를 거치지 않고 이 목록을 쓴다.
 */
export function headerPairs(base: HeadersInit | undefined, accept: string, extra: HeadersInit | undefined): Array<[string, string]> {
  const out: Array<[string, string]> = [];
  const put = (name: string, value: string) => {
    const at = out.findIndex(([n]) => n.toLowerCase() === name.toLowerCase());
    if (at >= 0) out[at] = [name, value];
    else out.push([name, value]);
  };
  const each = (init: HeadersInit | undefined) => {
    if (!init) return;
    if (init instanceof Headers) init.forEach((v, k) => put(k, v));
    else if (Array.isArray(init)) for (const [k, v] of init) put(k, v);
    else for (const [k, v] of Object.entries(init)) put(k, v);
  };
  each(base);
  if (!out.some(([n]) => n.toLowerCase() === "user-agent")) put("User-Agent", CRAWLER_USER_AGENT);
  if (!out.some(([n]) => n.toLowerCase() === "accept")) put("Accept", accept);
  each(extra);
  return out;
}

/** curl 결과를 Response 로 감싼다 — 아래 흐름(상태 검사, json/text 파싱)이 전송기를 몰라도 되게 */
async function sendWithCurl(url: string, headers: Array<[string, string]>, opts: RequestOptions | undefined, timeoutMs: number): Promise<Response> {
  const { status, body } = await runCurl(url, {
    method: typeof opts?.method === "string" ? opts.method : "GET",
    headers,
    body: typeof opts?.body === "string" ? opts.body : undefined,
    timeoutMs,
  });
  // status 0 = curl 이 응답을 못 받음. 502 로 올려 재시도 대상이 되게 한다
  return new Response(body, { status: status === 0 ? 502 : status });
}

export function createHttpClient(options: HttpClientOptions): HttpClient {
  const { source, label, timeoutMs = DEFAULT_TIMEOUT_MS, headers, onStatus, transport = "fetch" } = options;

  // 헤더 해석은 try 밖에서 한다 — 여기서 던진 AdapterError(키 없음 등)를 "요청 실패"로 덮어쓰면 원인이 사라진다.
  async function send(url: string, accept: string, opts: RequestOptions | undefined): Promise<{ res: Response; ctx: string }> {
    const ctx = opts?.context ?? url;
    const base = typeof headers === "function" ? headers() : headers;
    let res: Response;
    try {
      res =
        transport === "curl"
          ? await sendWithCurl(url, headerPairs(base, accept, opts?.headers), opts, timeoutMs)
          : await fetch(url, { ...opts, headers: mergeHeaders(base, accept, opts?.headers), signal: AbortSignal.timeout(timeoutMs) });
    } catch (e) {
      if (e instanceof AdapterError) throw e;
      throw new AdapterError(`${label} 요청 실패 (${ctx}): ${errMsg(e)}`, source, true);
    }
    return { res, ctx };
  }

  function checkStatus(res: Response, ctx: string): void {
    if (res.ok) return;
    const custom = onStatus?.(res.status, ctx);
    if (custom) throw custom;
    throw new AdapterError(`${label} HTTP ${res.status} (${ctx})`, source, isRetryableStatus(res.status));
  }

  return {
    async json(url, opts) {
      const { res, ctx } = await send(url, "application/json", opts);
      checkStatus(res, ctx);
      try {
        return await res.json();
      } catch (e) {
        // 파싱 실패는 중간 프록시가 끼어들었을 때도 나므로 재시도 가치가 있다
        throw new AdapterError(`${label} JSON 파싱 실패 (${ctx}): ${errMsg(e)}`, source, true);
      }
    },

    async text(url, opts) {
      const { res, ctx } = await send(url, "text/html", opts);
      checkStatus(res, ctx);
      return res.text();
    },

    async raw(url, opts) {
      const { res } = await send(url, "application/json", opts);
      return res;
    },
  };
}

/** 소스별로 자주 쓰는 onStatus 조각 — "이 코드는 '대상 없음'이다"를 한 줄로 선언한다 */
export function notFoundAs(source: Source, message: (ctx: string) => string, statuses: number[] = [404]) {
  return (status: number, ctx: string): AdapterError | undefined =>
    statuses.includes(status) ? new AdapterError(message(ctx), source, false) : undefined;
}
