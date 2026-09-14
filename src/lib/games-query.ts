// /games 목록의 쿼리스트링 ↔ 필터 변환. 순수 유틸(서버/클라 양쪽에서 import 가능).
// 목록 상태를 전부 주소에 담아 서버 컴포넌트만으로 필터·정렬·페이지를 돌리기 위한 단일 원천이다.
import { ROUTES } from "./routes";

/** 정렬 키. 값이 그대로 쿼리스트링에 실린다 */
export const GAME_SORTS = ["discount", "price", "release", "title"] as const;
export type GameSort = (typeof GAME_SORTS)[number];
export const DEFAULT_GAME_SORT: GameSort = "discount";

export const SORT_LABEL: Record<GameSort, string> = {
  discount: "할인율순",
  price: "가격 낮은순",
  release: "최신 출시순",
  title: "제목순",
};

/** 플랫폼 값은 DB enum 이 원천이라 여기서는 문자열로 두고, 페이지가 enum 으로 좁힌다 */
export type GamesQuery = {
  q?: string;
  platform?: string;
  genre?: string;
  onSale?: boolean;
  sort?: GameSort;
  /** 1-based */
  page?: number;
};

export function isGameSort(v: string | undefined): v is GameSort {
  return GAME_SORTS.includes(v as GameSort);
}

/** 쿼리스트링 값 길이 상한 — 검색어·필터 모두 같은 규칙을 쓴다 */
export const MAX_PARAM_LEN = 100;

/** 다중 값(?q=a&q=b)은 첫 값만. 빈 문자열은 "없음"으로 접는다 */
export function firstParam(v: string | string[] | undefined): string | undefined {
  const raw = Array.isArray(v) ? v[0] : v;
  const t = raw?.trim();
  return t ? t.slice(0, MAX_PARAM_LEN) : undefined;
}

/** 쿼리스트링 → 필터. 모르는 값은 조용히 버려 항상 유효한 목록이 나오게 한다 */
export function parseGamesQuery(sp: Record<string, string | string[] | undefined>): GamesQuery {
  const sort = firstParam(sp.sort);
  const page = Number(firstParam(sp.page));
  return {
    q: firstParam(sp.q),
    platform: firstParam(sp.platform),
    genre: firstParam(sp.genre),
    onSale: firstParam(sp.sale) === "1",
    sort: isGameSort(sort) ? sort : undefined,
    page: Number.isFinite(page) && page > 0 ? Math.floor(page) : 1,
  };
}

/**
 * 현재 필터에서 일부만 바꾼 /games URL.
 * 기본값(정렬=discount, page=1, 빈 필터)은 빼서 같은 화면이 항상 같은 주소가 되게 한다 — 캐시 키가 쪼개지지 않는다.
 */
export function gamesHref(current: GamesQuery, patch: Partial<GamesQuery> = {}): string {
  const next = { ...current, ...patch };
  const params = new URLSearchParams();
  if (next.q) params.set("q", next.q);
  if (next.platform) params.set("platform", next.platform);
  if (next.genre) params.set("genre", next.genre);
  if (next.onSale) params.set("sale", "1");
  if (next.sort && next.sort !== DEFAULT_GAME_SORT) params.set("sort", next.sort);
  if (next.page && next.page > 1) params.set("page", String(next.page));
  const qs = params.toString();
  return qs ? `${ROUTES.game}?${qs}` : ROUTES.game;
}
