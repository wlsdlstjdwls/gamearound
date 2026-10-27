// 인디 상세 유입 경로 갈래(2026-10-27, 기획서 4.3 메이커 멤버십 "내 게임 통계 자세히"). 조회를 적는 쪽(services/indie/fame)과
// 통계 화면이 같은 이름을 본다.
//
// 근거는 둘이다: 주소의 ?from=(명예의 전당, 슈퍼루키, 등록현황 — lib/indie/query)와 브라우저가 보내는 Referer.
// from 이 먼저다 — 우리 화면끼리는 Referer 정책에 따라 경로가 잘려 올 수 있지만 from 은 우리가 실은 값이다.
// Referer 가 우리 사이트면 경로 첫 마디로, 바깥이면 호스트로 가른다. 갈래를 몇 개로 묶는 이유는 schema-indie-promo 의 indieViewSources 주석.
import { ROUTES } from "@/lib/routes";
import { INDIE_FROM, type IndieFrom } from "./query";

export const TRAFFIC_SOURCES = [
  "home",
  "indie_list",
  "hall_of_fame",
  "rookies",
  "board",
  "game",
  "internal",
  "search_engine",
  "youtube",
  "sns",
  "external",
  "direct",
] as const;
export type TrafficSource = (typeof TRAFFIC_SOURCES)[number];

const FROM_SOURCE: Record<IndieFrom, TrafficSource> = { [INDIE_FROM.hallOfFame]: "hall_of_fame", [INDIE_FROM.rookies]: "rookies", [INDIE_FROM.mine]: "internal" };

/** 우리 사이트 경로 첫 마디 → 갈래. 없는 마디는 internal. 마디는 경로 표(lib/routes)에서 읽는다 — 주소가 바뀌면 같이 따라간다 */
const firstSeg = (path: string) => path.split("/").filter(Boolean)[0] ?? "";
const PATH_SOURCE: Record<string, TrafficSource> = {
  [firstSeg(ROUTES.home)]: "home",
  [firstSeg(ROUTES.indie)]: "indie_list",
  [firstSeg(ROUTES.hallOfFame)]: "hall_of_fame",
  [firstSeg(ROUTES.rookies)]: "rookies",
  [firstSeg(ROUTES.board)]: "board",
  [firstSeg(ROUTES.lounge)]: "board",
  [firstSeg(ROUTES.game)]: "game",
};

/** 바깥 호스트 → 갈래. 호스트 끝이 이 이름이거나 이름 + "." 으로 시작하는 마디를 품으면 맞다(google.co.kr, m.search.naver.com) */
const HOST_SOURCE: Array<{ names: readonly string[]; source: TrafficSource }> = [
  { names: ["google", "naver", "daum", "bing", "duckduckgo", "yahoo", "zum"], source: "search_engine" },
  { names: ["youtube", "youtu"], source: "youtube" },
  { names: ["x", "twitter", "t", "facebook", "instagram", "threads", "discord", "reddit", "tiktok", "kakao"], source: "sns" },
];

function hostSource(host: string): TrafficSource {
  // 마디 단위로 본다 — "x" 가 "box.com" 에 걸리지 않게. 맨 끝(최상위 도메인)은 이름이 아니다
  const labels = host.toLowerCase().split(".").slice(0, -1);
  for (const { names, source } of HOST_SOURCE) if (labels.some((l) => names.includes(l))) return source;
  return "external";
}

/**
 * 조회 한 번의 갈래. ownHost 는 우리 사이트 호스트(요청의 Host)다 — 배포 주소가 여럿이라(미리 보기, 운영) 상수로 박지 않는다.
 * 주소를 읽지 못하면 바깥으로 친다. 같은 상세 안 이동(경로가 /indie/<slug>)은 인디 목록과 같다고 보지 않고 internal 이다.
 */
export function classifyTraffic(input: { from: IndieFrom | null; referer: string | null; ownHost: string | null }): TrafficSource {
  if (input.from) return FROM_SOURCE[input.from];
  if (!input.referer) return "direct";
  let url: URL;
  try {
    url = new URL(input.referer);
  } catch {
    return "external";
  }
  if (input.ownHost && url.host === input.ownHost) {
    const segs = url.pathname.split("/").filter(Boolean);
    if (segs[0] === firstSeg(ROUTES.indie) && segs.length > 1) return "internal";
    return PATH_SOURCE[segs[0] ?? ""] ?? "internal";
  }
  return hostSource(url.hostname);
}
