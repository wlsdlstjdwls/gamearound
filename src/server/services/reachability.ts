// 실행 환경 진단 — "여기서는 어느 스토어가 열리나" 를 실측한다.
//
// 왜 필요한가: 막히는 방식이 소스마다 달라 로그만 보고는 구분이 안 된다.
//   닌텐도 — 한국 밖 IP 에 202 + 빈 본문. 상태 코드는 정상이라 "검색 결과 0건" 과 똑같이 보인다
//   Epic  — 데이터센터 IP 는 403, 게다가 Node 의 TLS 지문도 막혀 원인이 겹친다
// 그래서 배포 환경(Vercel 서울 리전 등)을 바꿀 때마다 여기로 한 번 찔러 보고 판단한다.
//
// 어댑터를 거치지 않고 직접 요청하는 이유: 어댑터 경로는 재시도, curl 전송기가 끼어 있어
// "무엇이 막혔는지" 가 흐려진다. 여기서는 날것의 응답만 본다.
import { EPIC_BROWSER_HEADERS, EPIC_GRAPHQL_URL } from "@/server/adapters/epic";
import { runCurl } from "@/server/adapters/curl";
import { VERCEL_REGION_ENV } from "@/server/adapters/http";
import { NINTENDO_BASE_URL } from "@/server/adapters/nintendo";
import { GOG_CATALOG_URL } from "@/server/adapters/gog";
import { CRAWLER_USER_AGENT } from "@/lib/site";
import { errorMessage } from "@/lib/errors";

/** 한 소스당 대기 시간. 셋을 동시에 보내므로 전체는 이 값 언저리에서 끝난다 */
const PROBE_TIMEOUT_MS = 12_000;
/**
 * "내용이 있다"고 볼 최소 본문 크기. 소스마다 다르다 —
 * 닌텐도는 검색 결과 HTML(수십 KB)이라 500B 면 빈 응답이지만, Epic 의 ping 은 정상 응답이 32B 다.
 */
const MIN_BODY_BYTES = { html: 500, json: 10 } as const;

export type ProbeVerdict = "ok" | "blocked" | "empty" | "error";

export interface ProbeResult {
  source: string;
  /** 이 소스가 무엇을 확인하는지 — 결과만 보고도 뜻을 알 수 있게 */
  checks: string;
  verdict: ProbeVerdict;
  status: number | null;
  bytes: number | null;
  elapsedMs: number;
  detail: string;
}

export interface ReachabilityReport {
  /** Vercel 이 알려주는 실행 리전(icn1 = 서울). 없으면 Vercel 이 아니다 */
  region: string;
  /** 나가는 IP. 지오 차단인지 대역 차단인지 가릴 때 쓴다 */
  egressIp: string;
  checkedAt: string;
  probes: ProbeResult[];
  /** 결과를 "그래서 무엇을 하면 되는가" 로 옮긴 문장들 */
  summary: string[];
}

/**
 * 상태 코드와 본문 크기로 판정한다.
 * 403, 401 은 대놓고 막은 것이고, 2xx 인데 본문이 비었으면 조용히 막은 것이다(닌텐도).
 */
export function classifyProbe(status: number, bytes: number, minBytes: number): ProbeVerdict {
  if (status === 403 || status === 401 || status === 429) return "blocked";
  if (status < 200 || status >= 300) return "error";
  return bytes < minBytes ? "empty" : "ok";
}

/**
 * 한 줄짜리 사실 기술. 원인 해석은 여기서 하지 않는다 —
 * 403 하나만 보고는 IP 가 막힌 건지 전송기가 막힌 건지 알 수 없다. 그 판단은 summarize 가 한다.
 */
export function describeVerdict(source: string, verdict: ProbeVerdict): string {
  if (verdict === "ok") return `${source}: 응답 정상`;
  if (verdict === "blocked") return `${source}: 거부됨 (403, 401, 429)`;
  if (verdict === "empty") return `${source}: 2xx 인데 본문이 비었다`;
  return `${source}: 요청 실패`;
}

const verdictOf = (probes: ProbeResult[], source: string): ProbeVerdict | undefined =>
  probes.find((p) => p.source === source)?.verdict;

/**
 * 진단 결과를 "그래서 무엇을 하면 되는가" 로 옮긴다.
 * 판정 하나가 아니라 조합을 봐야 원인이 갈린다 — 특히 Epic 은 fetch 와 curl 을 같이 봐야 한다.
 */
export function summarize(probes: ProbeResult[]): string[] {
  const out: string[] = [];

  const nintendo = verdictOf(probes, "nintendo");
  if (nintendo === "ok") out.push("닌텐도: 수집 가능 — 이 환경은 한국 IP 로 보인다. 가정용 회선 의존을 뗄 수 있다");
  else if (nintendo === "empty") out.push("닌텐도: 한국 밖 IP 다 (2xx + 빈 본문). 한국 출구가 필요하다");
  else if (nintendo) out.push("닌텐도: 요청 자체가 실패했다 — 차단이 아니라 연결 문제일 수 있다");

  const fetchVerdict = verdictOf(probes, "epic (fetch)");
  const curlVerdict = verdictOf(probes, "epic (curl)");
  if (curlVerdict === "ok") {
    out.push(
      fetchVerdict === "ok"
        ? "Epic: 어느 전송기로도 통과한다 — curl 없이도 수집 가능"
        : "Epic: IP 는 통과하고 Node 의 TLS 지문만 막혔다 — curl 전송기로 수집 가능(어댑터 기본값)",
    );
  } else if (curlVerdict === "blocked") {
    out.push("Epic: curl 로도 거부됐다 — 출구 IP 대역 자체가 막혔다. 주거용 출구가 필요하다");
  } else if (curlVerdict === "error") {
    out.push("Epic: 이 환경에는 curl 이 없다 — IP 가 통과하더라도 여기서는 수집할 수 없다");
  }

  if (verdictOf(probes, "gog") !== "ok") {
    out.push("주의: 대조군(GOG)까지 실패했다. 스토어 차단이 아니라 이 환경의 바깥 연결을 먼저 의심한다");
  }
  return out;
}

/** curl 로 한 번 더 — Epic 은 Node 의 TLS 지문이 막혀 fetch 와 결과가 다르다(adapters/curl 참고) */
async function probeWithCurl(source: string, checks: string, url: string, body: string): Promise<ProbeResult> {
  const startedAt = Date.now();
  try {
    const res = await runCurl(url, {
      method: "POST",
      headers: [...Object.entries(EPIC_BROWSER_HEADERS), ["Content-Type", "application/json"]],
      body,
      timeoutMs: PROBE_TIMEOUT_MS,
    });
    const verdict = classifyProbe(res.status, res.body.length, MIN_BODY_BYTES.json);
    return { source, checks, verdict, status: res.status, bytes: res.body.length, elapsedMs: Date.now() - startedAt, detail: describeVerdict(source, verdict) };
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

async function probe(
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

const timeout = () => AbortSignal.timeout(PROBE_TIMEOUT_MS);

/** 응답 내용은 보지 않는다 — 통과 여부만 알면 된다 */
const EPIC_PING_BODY = JSON.stringify({ query: "query ping { __typename }" });

/** 나가는 IP. 확인용 외부 서비스라 실패해도 진단 전체를 멈추지 않는다 */
async function egressIp(): Promise<string> {
  try {
    const res = await fetch("https://api.ipify.org?format=json", { signal: timeout(), cache: "no-store" });
    const data = (await res.json()) as { ip?: string };
    return data.ip ?? "알 수 없음";
  } catch (e) {
    return `알 수 없음 (${errorMessage(e)})`;
  }
}

export async function probeStoreReachability(): Promise<ReachabilityReport> {
  const [ip, probes] = await Promise.all([
    egressIp(),
    Promise.all([
      // 닌텐도 — 한국 IP 인지 가르는 시험. 한국 밖이면 202 + 빈 본문이 온다
      probe("nintendo", "한국 eShop 검색 페이지가 내용을 주는가", MIN_BODY_BYTES.html, () =>
        fetch(`${NINTENDO_BASE_URL}/catalogsearch/result/?q=마리오`, {
          headers: { "User-Agent": CRAWLER_USER_AGENT, "Accept-Language": "ko-KR,ko;q=0.9" },
          signal: timeout(),
          cache: "no-store",
        }),
      ),
      // Epic 은 두 갈래로 잰다. 하나만 보면 원인을 못 가른다:
      //   fetch 가 403 이어도 curl 이 200 이면 → IP 는 통과, Node 의 TLS 지문만 막힌 것(가정용 회선이 이렇다)
      //   둘 다 403 이면 → IP 대역이 거부된 것(Actions 러너가 이렇다)
      //   curl 자체가 없으면 → 그 환경에서는 Epic 을 쓸 방법이 없다(Vercel 함수)
      probe("epic (fetch)", "Node 의 기본 전송기로 Cloudflare 를 통과하는가", MIN_BODY_BYTES.json, () =>
        fetch(EPIC_GRAPHQL_URL, {
          method: "POST",
          headers: { ...EPIC_BROWSER_HEADERS, "Content-Type": "application/json" },
          body: EPIC_PING_BODY,
          signal: timeout(),
          cache: "no-store",
        }),
      ),
      probeWithCurl("epic (curl)", "curl 전송기로는 통과하는가 = IP 대역이 거부됐는지", EPIC_GRAPHQL_URL, EPIC_PING_BODY),
      // GOG — 대조군. 이것까지 막히면 스토어가 아니라 이 환경의 바깥 연결이 문제다
      probe("gog", "대조군 (어디서든 열리는 소스)", MIN_BODY_BYTES.json, () =>
        fetch(`${GOG_CATALOG_URL}?limit=5&locale=en-US&countryCode=KR`, {
          headers: { "User-Agent": CRAWLER_USER_AGENT },
          signal: timeout(),
          cache: "no-store",
        }),
      ),
    ]),
  ]);

  return {
    region: process.env[VERCEL_REGION_ENV] ?? "로컬 (Vercel 아님)",
    egressIp: ip,
    checkedAt: new Date().toISOString(),
    probes,
    summary: summarize(probes),
  };
}
