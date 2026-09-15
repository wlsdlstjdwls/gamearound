// 진단 실행 도구 — 한 경로를 찔러 ProbeResult 하나를 만든다.
//
// 어댑터를 거치지 않고 직접 요청하는 이유: 어댑터 경로는 재시도, curl 전송기가 끼어 있어
// "무엇이 막혔는지" 가 흐려진다. 여기서는 날것의 응답만 본다.
import { runCurl } from "@/server/adapters/curl";
import { errorMessage } from "@/lib/errors";
import { classifyProbe, describeVerdict, MIN_BODY_BYTES, type ProbeResult } from "./classify";

/** 한 소스당 대기 시간. 모두 동시에 보내므로 전체는 이 값 언저리에서 끝난다 */
export const PROBE_TIMEOUT_MS = 12_000;

export const timeout = () => AbortSignal.timeout(PROBE_TIMEOUT_MS);

export async function probe(
  source: string,
  checks: string,
  minBytes: number,
  run: () => Promise<Response>,
): Promise<ProbeResult> {
  const startedAt = Date.now();
  try {
    const res = await run();
    const body = await res.text();
    const verdict = classifyProbe(res.status, body.length, minBytes);
    return {
      source,
      checks,
      verdict,
      status: res.status,
      bytes: body.length,
      elapsedMs: Date.now() - startedAt,
      detail: describeVerdict(source, verdict),
    };
  } catch (e) {
    return {
      source,
      checks,
      verdict: "error",
      status: null,
      bytes: null,
      elapsedMs: Date.now() - startedAt,
      detail: `${source}: ${errorMessage(e)}`,
    };
  }
}

/** curl 로 한 번 더 — Epic 은 Node 의 TLS 지문이 막혀 fetch 와 결과가 다르다(adapters/curl 참고) */
export async function probeWithCurl(
  source: string,
  checks: string,
  url: string,
  headers: Array<[string, string]>,
  body: string,
): Promise<ProbeResult> {
  const startedAt = Date.now();
  try {
    const res = await runCurl(url, { method: "POST", headers, body, timeoutMs: PROBE_TIMEOUT_MS });
    const verdict = classifyProbe(res.status, res.body.length, MIN_BODY_BYTES.json);
    return {
      source,
      checks,
      verdict,
      status: res.status,
      bytes: res.body.length,
      elapsedMs: Date.now() - startedAt,
      detail: describeVerdict(source, verdict),
    };
  } catch (e) {
    // Vercel 함수처럼 curl 바이너리가 없는 환경이면 여기로 온다 — Epic 은 그 환경에서 못 쓴다는 뜻이다
    return {
      source,
      checks,
      verdict: "error",
      status: null,
      bytes: null,
      elapsedMs: Date.now() - startedAt,
      detail: `${source}: curl 경로를 쓸 수 없다 (${errorMessage(e)}) — 이 환경에서는 Epic 수집이 불가능하다`,
    };
  }
}

/** 나가는 IP. 확인용 외부 서비스라 실패해도 진단 전체를 멈추지 않는다 */
export async function egressIp(): Promise<string> {
  try {
    const res = await fetch("https://api.ipify.org?format=json", { signal: timeout(), cache: "no-store" });
    const data = (await res.json()) as { ip?: string };
    return data.ip ?? "알 수 없음";
  } catch (e) {
    return `알 수 없음 (${errorMessage(e)})`;
  }
}
