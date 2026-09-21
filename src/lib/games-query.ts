// /games 목록의 쿼리스트링 ↔ 필터 변환. 순수 유틸(서버/클라 양쪽에서 import 가능).
// 목록 상태를 전부 주소에 담아 서버 컴포넌트만으로 필터, 정렬, 페이지를 돌리기 위한 단일 원천이다.
import { ROUTES } from "./routes";

/** 정렬 키. 값이 그대로 쿼리스트링에 실린다. 맨 앞이 기본값이라 순서가 뜻을 가진다 */
export const GAME_SORTS = ["popular", "discount", "price", "release", "title"] as const;
export type GameSort = (typeof GAME_SORTS)[number];
/**
 * 기본 정렬 — 인기순.
 *
 * 2026-09-21 에 할인율순에서 바꿨다. 할인율순은 "가장 많이 깎인 것" 이지 "가장 살 만한 것" 이 아니다.
 * 90% 짜리는 대개 묵은 게임이라(MIN_DISCOUNT_STEPS 주석이 이미 알고 있던 사실이다)
 * 카탈로그 7만 건의 첫인상이 아무도 모르는 싸구려로 채워지고 있었다.
 *
 * 인기순을 쓸 수 있게 된 근거는 순번을 줍기 시작해서다(server/sync/rank-writer).
 * 판매량을 주는 스토어는 없으므로 스토어 인기순위가 우리가 가진 가장 좋은 대리지표다.
 */
export const DEFAULT_GAME_SORT: GameSort = "popular";

export const SORT_LABEL: Record<GameSort, string> = {
  popular: "인기순",
  discount: "할인율순",
  price: "가격 낮은순",
  release: "최신 출시순",
  title: "제목순",
};

/**
 * 최소 할인율 칸. 자유 입력이 아니라 정해진 단으로 두는 이유는 두 가지다.
 * 하나, 목록 캐시 키가 값마다 쪼개진다 — 33%, 34% 가 각각 다른 캐시가 된다.
 * 둘, 실제 구매 행동은 "30% 넘으면 산다" 쪽이라 1% 단위를 고를 이유가 없다.
 * 70 까지만 두는 것은 그 위(80, 90)가 대개 묵은 게임이라 한 칸 더 늘려도 목록이 거의 같아서다.
 */
export const MIN_DISCOUNT_STEPS = [30, 50, 70] as const;
export type MinDiscount = (typeof MIN_DISCOUNT_STEPS)[number];

export function isMinDiscount(v: number): v is MinDiscount {
  return (MIN_DISCOUNT_STEPS as readonly number[]).includes(v);
}

/**
 * 가격 상한 칸(원). 할인율과는 다른 질문에 답한다 — "얼마나 깎였나" 가 아니라 "내 예산에 드나".
 * -90% 인데 6만원인 게임과 정가 5천원인 게임은 할인 축에서만 보면 앞엣것이 위에 서지만,
 * 만원짜리를 찾는 사람에게는 뒤엣것만 답이다.
 * 0 은 "무료" 다 — 별도 칸을 두지 않고 상한 0 으로 두면 조건식이 하나로 유지된다.
 */
export const MAX_PRICE_STEPS = [0, 5_000, 10_000, 30_000] as const;
export type MaxPrice = (typeof MAX_PRICE_STEPS)[number];

export function isMaxPrice(v: number): v is MaxPrice {
  return (MAX_PRICE_STEPS as readonly number[]).includes(v);
}

/** 가격 상한 칩 문구. 만 단위로 안 떨어지는 값은 천 단위로 읽는다 — "0.5만원" 은 아무도 그렇게 말하지 않는다 */
export function maxPriceLabel(v: MaxPrice): string {
  if (v === 0) return "무료";
  return v % 10_000 === 0 ? `${v / 10_000}만원 이하` : `${v / 1_000}천원 이하`;
}

/**
 * 플랫폼 값 구분자. 주소에 `platform=ps5,switch` 로 실린다.
 *
 * 왜 한 칸에 여러 값을 담나: 칸을 나누면(platform=, store=) 서로 어긋난 조합이 생기고,
 * 같은 화면이 두 개의 주소를 갖게 된다. 한 칸에 두면 "고른 것들" 이 곧 주소다.
 */
export const PLATFORM_VALUE_SEP = ",";

/** 주소의 platform 값 → 고른 값 목록. 빈 값, 중복은 버린다(같은 선택이 늘 같은 문자열이 되도록) */
export function parsePlatformValues(raw: string | undefined): string[] {
  if (!raw) return [];
  return [...new Set(raw.split(PLATFORM_VALUE_SEP).map((v) => v.trim()).filter(Boolean))];
}

/** 고른 값 목록 → 주소에 실을 문자열. 순서를 고정해야 같은 선택이 같은 캐시 키가 된다 */
export function joinPlatformValues(values: string[], order: readonly string[]): string | undefined {
  const picked = [...new Set(values)].filter((v) => order.includes(v));
  if (picked.length === 0) return undefined;
  return order.filter((v) => picked.includes(v)).join(PLATFORM_VALUE_SEP);
}

/** 플랫폼 값은 DB enum 이 원천이라 여기서는 문자열로 두고, 페이지가 enum 으로 좁힌다 */
export type GamesQuery = {
  q?: string;
  platform?: string;
  genre?: string;
  onSale?: boolean;
  /** 이 할인율 이상만. onSale 과 같은 축이라 둘 중 하나만 선다(gamesHref 가 맞춰 지운다) */
  minDiscount?: MinDiscount;
  /** 이 금액 이하만(원). 0 은 무료 */
  maxPrice?: MaxPrice;
  /** 회사 slug — 회사 화면과 목록 필터가 같은 키를 쓴다 */
  company?: string;
  /** 구독(게임패스 등)으로 지금 플레이할 수 있는 게임만 */
  subscription?: boolean;
  /**
   * 내 기기로 돌아가는 게임만. 값은 기기를 접은 문자열이다(lib/hardware/rig).
   * 기기 id 가 아니라 티어를 싣는 이유는 그 파일 머리 주석에 있다 — 여기서는 문자열로 두고
   * 조회하는 쪽이 parseRig 로 좁힌다(platform 을 문자열로 두는 것과 같은 이유다).
   */
  rig?: string;
  sort?: GameSort;
  /** 1-based */
  page?: number;
};

export function isGameSort(v: string | undefined): v is GameSort {
  return GAME_SORTS.includes(v as GameSort);
}

/** 쿼리스트링 값 길이 상한 — 검색어, 필터 모두 같은 규칙을 쓴다 */
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
  const rawOff = Number(firstParam(sp.off));
  const off = isMinDiscount(rawOff) ? rawOff : undefined;
  const rawMax = Number(firstParam(sp.max));
  const max = isMaxPrice(rawMax) ? rawMax : undefined;
  return {
    q: firstParam(sp.q),
    platform: firstParam(sp.platform),
    genre: firstParam(sp.genre),
    onSale: firstParam(sp.sale) === "1",
    minDiscount: off,
    maxPrice: max,
    company: firstParam(sp.company),
    subscription: firstParam(sp.sub) === "1",
    rig: firstParam(sp.rig),
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
  if (next.minDiscount) params.set("off", String(next.minDiscount));
  else if (next.onSale) params.set("sale", "1");
  // 0 은 "무료" 라는 뜻이 있는 값이라 falsy 로 접으면 안 된다
  if (next.maxPrice !== undefined) params.set("max", String(next.maxPrice));
  if (next.company) params.set("company", next.company);
  if (next.subscription) params.set("sub", "1");
  if (next.rig) params.set("rig", next.rig);
  if (next.sort && next.sort !== DEFAULT_GAME_SORT) params.set("sort", next.sort);
  if (next.page && next.page > 1) params.set("page", String(next.page));
  const qs = params.toString();
  return qs ? `${ROUTES.game}?${qs}` : ROUTES.game;
}
