// curl 전송기 — Node 의 TLS 지문을 막는 앞단(Cloudflare)이 있는 소스용.
//
// 왜 이런 게 필요한가: Epic 은 브라우저 헤더를 그대로 맞춰도 Node 에서 403 을 준다.
// undici, node:http2, 크롬 암호군 지정까지 다 해봤지만 전부 막혔고 curl 만 통과했다(2026-09-14 실측).
// 막는 기준이 헤더가 아니라 TLS ClientHello 모양이라 Node 안에서는 흉내 낼 방법이 없다.
//
// 그래서 이 파일은 **예외 통로**다. 새 어댑터는 기본 전송기(fetch)를 쓰고,
// "Node 만 막힌다"가 실측으로 확인된 소스에서만 transport: "curl" 을 켠다.
import { spawn } from "node:child_process";

/** curl 이 본문 뒤에 붙여 주는 상태 코드 구분자. 본문에 섞일 일이 없도록 개행 + 고정 토큰을 쓴다 */
const STATUS_MARK = "\n__curl_status__:";

export interface CurlRequest {
  method?: string;
  /** 선언 순서 그대로 보낼 헤더. 순서가 지문이 되는 곳이 있어 Map, 객체가 아니라 목록이다(http.ts 의 headerPairs) */
  headers?: Array<[string, string]>;
  body?: string;
  timeoutMs: number;
  /** 이 요청만 거쳐 갈 프록시(http://user:pass@host:port). 없으면 러너, 로컬 IP 로 그대로 나간다 */
  proxy?: string;
}

export interface CurlResponse {
  status: number;
  body: string;
}

/** curl 인자 조립 — 본문은 인자가 아니라 stdin 으로 넘긴다(길이 제한, 따옴표 문제를 피한다) */
export function curlArgs(url: string, req: CurlRequest): string[] {
  const args = [
    "--silent",
    "--show-error",
    "--location",
    "--max-time",
    String(Math.ceil(req.timeoutMs / 1000)),
    "--write-out",
    `${STATUS_MARK}%{http_code}`,
  ];
  // --proxy 는 헤더보다 앞에 둔다 — 순서가 지문이 되는 것은 HTTP 헤더뿐이고, curl 인자 순서는 무관하지만
  // 사람이 로그에서 "이 요청이 프록시를 탔는지" 를 맨 앞에서 바로 읽게 한다
  if (req.proxy) args.push("--proxy", req.proxy);
  for (const [k, v] of req.headers ?? []) args.push("--header", `${k}: ${v}`);
  if (req.method && req.method !== "GET") args.push("--request", req.method);
  if (req.body !== undefined) args.push("--data-binary", "@-");
  args.push(url);
  return args;
}

/** curl 출력(본문 + 상태 표시)을 가른다. 표시가 없으면 curl 이 죽은 것이라 0 으로 본다 */
export function splitCurlOutput(out: string): CurlResponse {
  const at = out.lastIndexOf(STATUS_MARK);
  if (at < 0) return { status: 0, body: out };
  return { status: Number(out.slice(at + STATUS_MARK.length).trim()) || 0, body: out.slice(0, at) };
}

/** curl 실행. 프로세스가 못 뜨거나(설치 안 됨) 0 이 아닌 코드로 끝나면 에러 메시지를 그대로 올린다 */
export function runCurl(url: string, req: CurlRequest): Promise<CurlResponse> {
  return new Promise((resolve, reject) => {
    const child = spawn("curl", curlArgs(url, req), { windowsHide: true });
    let out = "";
    let err = "";
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (c: string) => (out += c));
    child.stderr.on("data", (c: string) => (err += c));
    child.on("error", (e) => reject(new Error(`curl 실행 실패: ${e.message}`)));
    child.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(`curl 종료 코드 ${code}${err.trim() ? `: ${err.trim()}` : ""}`));
        return;
      }
      resolve(splitCurlOutput(out));
    });
    if (req.body !== undefined) child.stdin.end(req.body);
    else child.stdin.end();
  });
}
