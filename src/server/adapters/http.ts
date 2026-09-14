// 어댑터 공통 HTTP 계층.
// 6개 어댑터가 거의 같은 fetchJson 을 각자 들고 있었고, 타임아웃, UA, 재시도 판정이 조금씩 어긋나 있었다
// (같은 429 인데 어떤 소스는 retryable, 어떤 소스는 아니었다). 판정은 여기 한 곳에서만 한다.
// 어댑터는 "무엇을 어떤 헤더로 요청할지"만 정하고, 실패를 AdapterError 로 바꾸는 일은 이 파일이 맡는다.
import { AdapterError, CRAWLER_USER_AGENT, type Source } from "./types";
import { runCurl } from "./curl";

export const DEFAULT_TIMEOUT_MS = 15_000;

/**
 * 막힌 소스가 거쳐 갈 프록시 주소를 담는 환경변수(http://user:pass@host:port).
 * 값이 있으면 viaProxy 를 선언한 어댑터만 이 프록시로 나간다 — 없으면 평소대로 직접 나간다.
 */
export const CRAWL_PROXY_URL_ENV = "CRAWL_PROXY_URL";

/** 호출 시점에 읽는다 — dotenv 로딩 순서보다 늦게 평가해야 크롤 스크립트에서도 값이 잡힌다 */
export function crawlProxyUrl(): string | undefined {
  return process.env[CRAWL_PROXY_URL_ENV]?.trim() || undefined;
}

/** Vercel 이 함수 실행 리전을 알려주는 환경변수. 로컬에서는 비어 있다 */
export const VERCEL_REGION_ENV = "VERCEL_REGION";
/** 서울 리전. 프로젝트 설정(Functions > Region)에서 정한 값이고 코드로는 못 바꾼다 */
export const SEOUL_REGION = "icn1";

/**
 * 지금 이 코드가 서울 리전 함수 안에서 도는가.
 * 여기서는 한국 IP 로 나가므로 IP 대역 때문에 막히던 소스(nintendo, epic)가 열린다
 * (2026-09-14 /api/debug/reachability 실측: nintendo 200, epic curl 200, 출구 IP 43.201.77.62).
 */
export function runsInSeoulRegion(): boolean {
  return process.env[VERCEL_REGION_ENV] === SEOUL_REGION;
}

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
  /**
   * 우리 실행 환경의 IP 가 막혀 프록시를 거쳐야 하는 소스인지
   * (nintendo: 한국 밖 IP 차단, epic: 데이터센터 IP 차단 — sync/constants 의 LOCAL_ONLY_SOURCES 주석).
   * CRAWL_PROXY_URL 이 있으면 그 프록시를 거치고, 없으면 평소 전송기로 그대로 나간다.
   *
   * 프록시를 소스별로 켜는 이유: DB(Neon), Redis(Upstash), 재검증 호출까지 유료 프록시로 보내면
   * 요금과 지연만 늘고 얻는 게 없다. 전역 프록시 환경변수(HTTPS_PROXY)를 쓰지 않는 것도 같은 이유다.
   *
   * 프록시를 탈 때는 전송기를 curl 로 고정한다 — Node 의 fetch 는 프록시를 쓰려면 별도 디스패처
   * 패키지가 필요한데, 막힌 두 소스는 어차피 curl 경로(TLS 지문)를 요구하거나 요청이 드물다.
   */
  viaProxy?: boolean;
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
async function sendWithCurl(
  url: string,
  headers: Array<[string, string]>,
  opts: RequestOptions | undefined,
  timeoutMs: number,
  proxy?: string,
): Promise<Response> {
  const { status, body } = await runCurl(url, {
    method: typeof opts?.method === "string" ? opts.method : "GET",
    headers,
    body: typeof opts?.body === "string" ? opts.body : undefined,
    timeoutMs,
    proxy,
  });
  // status 0 = curl 이 응답을 못 받음. 502 로 올려 재시도 대상이 되게 한다
  return new Response(body, { status: status === 0 ? 502 : status });
}

export function createHttpClient(options: HttpClientOptions): HttpClient {
  const { source, label, timeoutMs = DEFAULT_TIMEOUT_MS, headers, onStatus, transport = "fetch", viaProxy = false } = options;

  // 헤더 해석은 try 밖에서 한다 — 여기서 던진 AdapterError(키 없음 등)를 "요청 실패"로 덮어쓰면 원인이 사라진다.
  async function send(url: string, accept: string, opts: RequestOptions | undefined): Promise<{ res: Response; ctx: string }> {
    const ctx = opts?.context ?? url;
    const base = typeof headers === "function" ? headers() : headers;
    const proxy = viaProxy ? crawlProxyUrl() : undefined;
    let res: Response;
    try {
      res =
        transport === "curl" || proxy
          ? await sendWithCurl(url, headerPairs(base, accept, opts?.headers), opts, timeoutMs, proxy)
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
