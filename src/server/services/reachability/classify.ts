// 진단 판정 — 응답을 "무엇을 하면 되는가" 로 옮긴다. 네트워크를 건드리지 않는 순수 함수만 둔다.
//
// 판정을 따로 떼어 둔 이유: 원인 해석은 probe 하나로는 못 한다. 403 하나만 보고는
// IP 가 막힌 건지 전송기가 막힌 건지 알 수 없어서, 조합을 보는 자리가 따로 있어야 한다.

/**
 * "내용이 있다"고 볼 최소 본문 크기. 소스마다 다르다 —
 * 닌텐도는 검색 결과 HTML(수십 KB)이라 500B 면 빈 응답이지만, Epic 의 ping 은 정상 응답이 32B 다.
 * list 는 목록 JSON 용이다: 막히면 0건짜리 껍데기가 오는데 그건 ok 가 아니다.
 */
export const MIN_BODY_BYTES = { html: 500, json: 10, list: 500 } as const;

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
 * 발견을 서울 함수(Vercel 크론)로 옮길 수 있는 소스와, 그 판단에 필요한 경로들.
 *
 * 경로를 둘로 나눠 적는 이유: 발견과 가격이 **다른 호스트**인 소스가 있다.
 * 발견만 열리고 가격이 막히면 신규 게임이 값 없이 등록된다 — 그건 옮긴 게 아니라 망가뜨린 것이다.
 *   steam  발견 store.steampowered.com  |  가격 api.steampowered.com
 *   xbox   발견 emerald.xboxservices.com |  가격 displaycatalog.mp.microsoft.com
 * psstore, gog 는 한 호스트가 둘 다 맡는다.
 */
const CRON_CANDIDATES: Array<{ label: string; probes: string[] }> = [
  { label: "Steam", probes: ["steam (발견)", "steam (가격)"] },
  { label: "PlayStation", probes: ["psstore"] },
  { label: "Xbox", probes: ["xbox (발견)", "xbox (가격)"] },
  { label: "GOG", probes: ["gog"] },
];

/** 후보 한 소스의 판정. 경로가 하나라도 빠져 있으면(진단에 없으면) 말하지 않는다 */
function summarizeCronCandidate(probes: ProbeResult[], candidate: (typeof CRON_CANDIDATES)[number]): string | null {
  const verdicts = candidate.probes.map((source) => ({ source, verdict: verdictOf(probes, source) }));
  if (verdicts.some((v) => v.verdict === undefined)) return null;
  const failed = verdicts.filter((v) => v.verdict !== "ok");
  if (failed.length === 0) return `${candidate.label}: 서울 함수에서 열린다 — 발견을 Vercel 크론으로 옮길 수 있다`;
  const detail = failed.map((v) => `${v.source} ${v.verdict}`).join(", ");
  return `${candidate.label}: 서울 함수에서 막힌다 (${detail}) — 이 소스의 발견은 Actions 에 남긴다`;
}

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

  const nintendoJp = verdictOf(probes, "nintendo_jp");
  if (nintendoJp === "ok") out.push("닌텐도 일본: 수집 가능 — 검색 API 가 열려 있다");
  else if (nintendoJp) out.push("닌텐도 일본: 검색 API 가 응답하지 않는다 — 이 환경에서는 일본 카탈로그를 못 훑는다");

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

  for (const candidate of CRON_CANDIDATES) {
    const line = summarizeCronCandidate(probes, candidate);
    if (line) out.push(line);
  }

  if (verdictOf(probes, "gog") !== "ok") {
    out.push("주의: 대조군(GOG)까지 실패했다. 스토어 차단이 아니라 이 환경의 바깥 연결을 먼저 의심한다");
  }
  return out;
}
