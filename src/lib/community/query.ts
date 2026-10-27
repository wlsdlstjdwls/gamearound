// 게시판 목록 주소 ↔ 조건. 탭, 기간, 검색, 쪽이 전부 주소에 실린다 — 뒤로 가기와 공유한 링크가 같은 화면으로 온다
// (2026-10-26 사용자 결정: 상태는 주소에 둔다). 목록 화면(서버)과 칩(클라이언트)이 같은 함수로 읽는다.
import { POPULAR_PERIODS, PROMO_TYPES, SEARCH_SCOPES, type PopularPeriod, type SearchScope } from "@/lib/community/constants";
import type { PromoType } from "@/server/db/schema";

export type BoardTab = "all" | "popular";
/** game 은 게임 slug — 게임 상세의 "이 게임 글" 링크가 그 게임에 이어진 글만 보게 건다(2026-10-27). 없으면 null */
export type BoardQuery = { q: string; scope: SearchScope; tab: BoardTab; period: PopularPeriod; page: number; type: PromoType | null; game: string | null };

/** 검색어 상한 — 주소창 손질로 들어오는 긴 문자열이 질의까지 가지 않게 */
const QUERY_MAX = 100;
/** 게임 slug 상한 — 주소 손질로 들어오는 긴 값을 질의까지 보내지 않는다. 실제 slug 는 이보다 훨씬 짧다 */
const GAME_SLUG_MAX = 200;
/** 인기글 탭의 기본 기간 = 최근 7일(기획서 5.2 의 첫 칸) */
const DEFAULT_PERIOD: PopularPeriod = 7;

type Search = Record<string, string | string[] | undefined>;
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export function parseBoardQuery(sp: Search): BoardQuery {
  const scope = first(sp.scope);
  const period = Number(first(sp.period));
  const page = Number(first(sp.page));
  const type = first(sp.type);
  const game = (first(sp.game) ?? "").trim();
  return {
    q: (first(sp.q) ?? "").trim().slice(0, QUERY_MAX),
    scope: (SEARCH_SCOPES as readonly string[]).includes(scope ?? "") ? (scope as SearchScope) : "all",
    tab: first(sp.tab) === "popular" ? "popular" : "all",
    period: (POPULAR_PERIODS as readonly number[]).includes(period) && first(sp.period) !== undefined ? (period as PopularPeriod) : DEFAULT_PERIOD,
    page: Number.isFinite(page) && page > 1 ? Math.floor(page) : 1,
    type: (PROMO_TYPES as readonly string[]).includes(type ?? "") ? (type as PromoType) : null,
    game: game && game.length <= GAME_SLUG_MAX ? game : null,
  };
}

/** 기본값은 주소에서 뺀다 — 같은 화면이 늘 같은 주소가 되게. 조건을 바꾸면 쪽은 1로 돌아간다(patch 에 page 가 없으면) */
export function boardHref(base: string, current: BoardQuery, patch: Partial<BoardQuery> = {}): string {
  const next = { ...current, page: 1, ...patch };
  const p = new URLSearchParams();
  if (next.game) p.set("game", next.game);
  if (next.type) p.set("type", next.type);
  if (next.tab === "popular") {
    p.set("tab", "popular");
    if (next.period !== DEFAULT_PERIOD) p.set("period", String(next.period));
  }
  if (next.q) {
    p.set("q", next.q);
    if (next.scope !== "all") p.set("scope", next.scope);
  }
  if (next.page > 1) p.set("page", String(next.page));
  const qs = p.toString();
  return qs ? `${base}?${qs}` : base;
}
