// 사이트 방문 기록의 모양(2026-10-30, 사용자 "통계 프로그램, 유입 등"). 적는 쪽(server/visits)과 읽는 쪽(이용현황)이 같은 이름을 본다.
//
// 무엇을 세나: 화면 조회(pv), 방문(세션 첫 화면, sessions), 방문자(브라우저 하나, 날마다 HyperLogLog 로 어림), 들어온 길(첫 화면의 Referer 갈래).
// 누가 봤는지는 남기지 않는다 — 방문자 열쇠는 브라우저가 만든 무작위 값이고, Redis 의 HyperLogLog 는 값을 되돌려 주지 않는다(개수만 어림한다).
// 갈래 이름은 인디 상세 유입 갈래(lib/indie/traffic)를 그대로 쓴다. 사이트 첫 화면의 Referer 는 바깥이거나 비어 있으므로
// 실제로 서는 것은 검색엔진, 유튜브, SNS, 다른 사이트, 주소로 바로, 다섯이다.
import { classifyTraffic, type TrafficSource } from "@/lib/indie/traffic";

/** 사이트 방문 갈래. 우리 화면끼리 온 것(home, game 등)은 첫 화면이 아니라 세지 않는다 */
export const SITE_SOURCES = ["search_engine", "youtube", "sns", "external", "direct"] as const satisfies readonly TrafficSource[];
export type SiteSource = (typeof SITE_SOURCES)[number];

/** 방문자 열쇠 모양. 브라우저가 crypto.randomUUID 로 만든다 */
export const VISITOR_ID_PATTERN = /^[0-9a-f-]{36}$/;
/** 경로 길이 상한. 우리 주소는 이보다 길 일이 없다 — 아무 문자열이나 보내는 요청을 거른다 */
export const VISIT_PATH_MAX = 300;
export const VISIT_REFERRER_MAX = 500;

/**
 * 세션 첫 화면의 들어온 길. 우리 사이트에서 왔다고 나오면(새 탭으로 연 링크 등) 주소로 바로 친다 —
 * 바깥에서 들어온 길이 아니라서 검색, SNS 와 견줄 갈래가 아니다.
 */
export function siteSourceOf(referrer: string | null, ownHost: string | null): SiteSource {
  const s = classifyTraffic({ from: null, referer: referrer || null, ownHost });
  return (SITE_SOURCES as readonly string[]).includes(s) ? (s as SiteSource) : "direct";
}

/** Redis 열쇠. 날짜는 한국 날짜(lib/format 의 kstDateKey) */
export const visitKeys = {
  /** 해시: pv, sessions */
  counts: (day: string) => `visits:${day}`,
  /** HyperLogLog: 방문자 열쇠 */
  visitors: (day: string) => `visitors:${day}`,
  /** 해시: 갈래별 방문 수 */
  sources: (day: string) => `visit-src:${day}`,
} as const;

/** 하루 칸의 수명(초). 이용현황은 최대 92일을 보지만 전년 같은 철과 견줄 수 있게 넉넉히 둔다 — 하루 칸 셋이 몇백 바이트라 부담이 없다 */
export const VISIT_TTL_SECONDS = 400 * 24 * 60 * 60;
