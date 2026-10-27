// 인디 홍보 기본기(2026-10-27, docs/기획_인디홍보_상위노출멤버십_2026-10-27.md 3장)의 수치와 순수 도우미 — 플레이하기 단추,
// 바깥 클릭 집계, 내 게임 통계가 같은 값을 본다.
//
// "플레이하기" 는 링크 종류로 고른다. 지금 바로 해 볼 수 있는 것(체험판, 웹 빌드)이 사러 가는 것(스토어)보다 앞이다 —
// 처음 보는 인디 게임에 돈부터 내는 사람은 드물고, 개발자가 가장 원하는 숫자는 "해 본 사람" 이다.
import type { IndieLink } from "@/server/db/schema";
import { INDIE_PLATFORMS, storeLinkKind, storeLinkPlatform, type IndiePlatform } from "./constants";

/** 내 게임 통계가 보는 기간. 기획서 3장 "지난 30일" — 한 달 반응을 보고 다음 글을 쓴다 */
export const INDIE_STATS_WINDOW_DAYS = 30;

/** 스토어 링크 가운데 플레이하기에 먼저 고르는 순서. 웹은 받지 않고 바로 하니 맨 앞, 그다음 인디가 가장 많이 나오는 PC */
const STORE_PRIORITY: readonly IndiePlatform[] = ["web", "pc", "switch", "playstation", "xbox", "mobile"];

/** 플레이하기로 셈하는 링크 종류 전부. 공식 사이트, 커뮤니티, 펀딩은 "나가기" 이지 "해 보기" 가 아니라 통계에서 따로 센다.
 *  목록으로 두는 이유: 광고 성과 질의(services/promotions/performance)가 SQL 안에서 같은 문턱으로 거른다 */
export const PLAY_LINK_KINDS: readonly string[] = ["demo", "store", ...INDIE_PLATFORMS.map(storeLinkKind)];

/** 플레이하기로 셈하는 링크인가 */
export function isPlayKind(kind: string): boolean {
  return PLAY_LINK_KINDS.includes(kind);
}

/** 링크 우선순위(작을수록 앞). 플레이하기가 아닌 링크는 null */
function playRank(kind: string): number | null {
  if (kind === "demo") return 0;
  const p = storeLinkPlatform(kind);
  if (p) return 1 + STORE_PRIORITY.indexOf(p);
  if (kind === "store") return 1 + STORE_PRIORITY.length;
  return null;
}

/**
 * 플레이하기 큰 단추가 가리킬 링크(글의 links 안 순번). 플레이할 링크가 없으면 null.
 * 순번을 돌려주는 이유: 경유 주소(lib/routes 의 indieOutPath)가 주소 대신 순번을 싣는다.
 * 플랫폼별 스토어 링크는 고른 플랫폼에 든 것만 본다 — 상세의 구매 마디와 같은 문턱이다(플랫폼을 뺐는데 링크만 남은 경우).
 */
export function primaryPlayLink(links: readonly IndieLink[], platforms: readonly string[]): { index: number; kind: string } | null {
  let best: { index: number; kind: string; rank: number } | null = null;
  links.forEach((l, index) => {
    const rank = playRank(l.kind);
    if (rank === null) return;
    const p = storeLinkPlatform(l.kind);
    if (p && !platforms.includes(p)) return;
    if (!best || rank < best.rank) best = { index, kind: l.kind, rank };
  });
  if (!best) return null;
  const { index, kind } = best;
  return { index, kind };
}
