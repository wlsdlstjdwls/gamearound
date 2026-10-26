// 출시예정 화면의 달 탭 띠가 쓰는 순수 함수.
//
// 서버 화면(page)과 클라이언트 띠(upcoming-month-nav)가 같은 규칙을 써야 해서 여기 둔다 —
// "use client" 파일에서 내보낸 함수는 서버 컴포넌트에서 평범한 함수로 부를 수 없다.
//
// 2026-10-07: 달마다 닻(#m2026-10)으로 내려가던 한 화면짜리를 걷고, 고른 달 하나를 ?month= 로 세운다
// (services/games/upcoming 의 UPCOMING_PAGE_SIZE 주석). 스크롤 위치로 "지금 읽는 달" 을 재던 함수도 같이 걷었다.
import { addonKindOf, type AddonKind } from "@/lib/games/addon-kind";
import { ROUTES } from "@/lib/routes";

/** 달을 고르는 주소 값의 이름 */
export const UPCOMING_MONTH_PARAM = "month";

/** 보기 방식 주소 값(기획서 v2.0 S-03 전체/월별 전환). 월별이 기본이라 주소에 없으면 월별이다 */
export const UPCOMING_VIEW_PARAM = "view";
export const UPCOMING_VIEW_ALL = "all";

/**
 * 출시 예정 정렬(기획서 v2.0 S-03 "정렬 옵션": 출시일순, 인기순). 앞이 기본값이다.
 * 목록(/games)의 GameSort 를 쓰지 않는 이유: 거기 "release" 는 최신 출시순(내림)이고 여기는 가까운 날짜부터(오름)다 —
 * 같은 값 이름에 반대 방향을 실으면 주소를 옮겨 붙일 때 뜻이 뒤집힌다.
 */
export const UPCOMING_SORTS = ["date", "popular"] as const;
export type UpcomingSort = (typeof UPCOMING_SORTS)[number];
export const UPCOMING_SORT_LABEL: Record<UpcomingSort, string> = { date: "출시일순", popular: "인기순" };

/**
 * 출시 예정 목록 안 조건(기획서 v2.0 S-03 공통 동작: 목록 안 검색, 장르, 플랫폼, 정렬).
 * 주소 이름은 목록(/games)과 같게 둔다(q, genre, platform, sort) — 두 화면을 오가도 같은 말이 같은 이름이다.
 */
export type UpcomingFilter = { q?: string; genre?: string; platform?: string; sort?: UpcomingSort };

/** 주소 값 한 칸의 최대 길이 — games-query 의 MAX_PARAM_LEN 과 같은 이유(질의에 그대로 들어간다) */
const UPCOMING_PARAM_MAX = 100;

/** 주소 값 하나를 다듬는다. 사람이 손으로 고치는 값이라 길이를 자르고 빈칸은 없는 것으로 본다 */
function clean(v: string | string[] | undefined): string | undefined {
  const one = (Array.isArray(v) ? v[0] : v)?.slice(0, UPCOMING_PARAM_MAX).trim();
  return one ? one : undefined;
}

export function readUpcomingFilter(sp: Record<string, string | string[] | undefined>): UpcomingFilter {
  const sort = clean(sp.sort);
  return {
    q: clean(sp.q),
    genre: clean(sp.genre),
    platform: clean(sp.platform),
    sort: sort && (UPCOMING_SORTS as readonly string[]).includes(sort) && sort !== UPCOMING_SORTS[0] ? (sort as UpcomingSort) : undefined,
  };
}

/** 고르는 사람이 무엇이든 걸었나. 걸렸으면 "이달의 기대작" 줄을 세우지 않는다(services/games/upcoming 의 picks 주석) */
export function hasUpcomingFilter(f: UpcomingFilter): boolean {
  return Boolean(f.q || f.genre || f.platform || f.sort);
}

/** 화면 안의 자리 — 보기 방식, 달, 쪽 */
export type UpcomingPlace = { all?: boolean; month?: string; page?: number };

/**
 * 출시 예정 주소 하나. 조건은 달, 쪽, 보기를 옮겨도 따라간다 — 장르를 걸고 달을 바꿨는데 장르가 풀리면 다시 골라야 한다.
 * 기본값(월별, 첫 달, 첫 쪽, 출시일순)은 꼬리에 싣지 않는다 — 같은 화면이 늘 같은 주소여야 캐시가 쪼개지지 않는다.
 */
export function upcomingHref(place: UpcomingPlace = {}, filter: UpcomingFilter = {}): string {
  const params = new URLSearchParams();
  if (place.all) params.set(UPCOMING_VIEW_PARAM, UPCOMING_VIEW_ALL);
  else if (place.month) params.set(UPCOMING_MONTH_PARAM, place.month);
  if (filter.q) params.set("q", filter.q);
  if (filter.genre) params.set("genre", filter.genre);
  if (filter.platform) params.set("platform", filter.platform);
  if (filter.sort && filter.sort !== UPCOMING_SORTS[0]) params.set("sort", filter.sort);
  if (place.page && place.page > 1) params.set("page", String(place.page));
  const tail = params.toString();
  return tail ? `${ROUTES.upcoming}?${tail}` : ROUTES.upcoming;
}

/** 전체 보기 주소. 첫 장은 꼬리를 붙이지 않는다 */
export function upcomingAllHref(page = 1, filter: UpcomingFilter = {}): string {
  return upcomingHref({ all: true, page }, filter);
}

/** 그 달을 세운 출시예정 주소. 첫 달(기본)은 꼬리 없이 둔다 — 같은 화면이 늘 같은 주소여야 캐시가 쪼개지지 않는다 */
export function upcomingMonthHref(key: string, firstKey: string | undefined, filter: UpcomingFilter = {}): string {
  return upcomingHref({ month: key === firstKey ? undefined : key }, filter);
}

/** 주소가 고른 달. 없거나 목록에 없는 달이면 첫 달(가장 가까운 달)이다 */
export function pickUpcomingMonth(keys: readonly string[], requested: string | undefined): string | undefined {
  return requested && keys.includes(requested) ? requested : keys[0];
}

export type MonthTab = { key: string; month: string; total: number };
export type YearGroup = { year: string; months: MonthTab[] };

/**
 * 탭을 연도로 묶는다(2026-09-22 2차, 사용자 지적: "년도도 반복되고").
 * 칸마다 "2026년" 을 붙이면 같은 글자가 네 번 서고 정작 골라야 하는 달이 그 뒤에 묻힌다.
 * 연도는 어디서 바뀌는지만 알면 되므로 묶음 머리로 한 번만 세운다.
 */
export function byYear(months: { key: string; total: number }[]): YearGroup[] {
  const out: YearGroup[] = [];
  for (const m of months) {
    const [year, month] = m.key.split("-");
    // 달 열쇠는 날짜 오름차순이라 같은 해가 반드시 붙어 온다 — 맨 뒤 묶음만 보면 된다
    let bucket = out[out.length - 1];
    if (bucket?.year !== year) {
      bucket = { year, months: [] };
      out.push(bucket);
    }
    bucket.months.push({ key: m.key, month: `${Number(month)}월`, total: m.total });
  }
  return out;
}

/**
 * "기다리는 추가 콘텐츠" 에서 뺄 갈래(2026-10-12). 출시 전 DLC 43건 중 절반이 사운드트랙, 아트북이었다 —
 * 그걸 기다리는 사람은 없다. 갈래는 제목 추정이라(lib/games/addon-kind) 놓치는 것이 있지만 여기서는 줄을 거르는 데만 쓴다.
 */
const UPCOMING_ADDON_HIDDEN_KINDS: ReadonlySet<AddonKind> = new Set(["media", "currency", "cosmetic"]);

/**
 * 후보는 본편 인기순으로 온다. 기다릴 만한 것을 거르고 상한만큼 자른 뒤 **날짜순으로 다시 세운다** —
 * 고르는 기준(무엇이 볼 만한가)과 보여 주는 순서(언제 나오나)가 다르다.
 * 같은 날짜끼리는 받은 순서(인기순)를 지킨다.
 */
export function pickUpcomingAddons<T extends { title: string; releaseDate: string }>(candidates: readonly T[], limit: number): T[] {
  const kept = candidates.filter((c) => !UPCOMING_ADDON_HIDDEN_KINDS.has(addonKindOf(c.title))).slice(0, limit);
  return kept
    .map((c, i) => ({ c, i }))
    .sort((a, b) => (a.c.releaseDate < b.c.releaseDate ? -1 : a.c.releaseDate > b.c.releaseDate ? 1 : a.i - b.i))
    .map(({ c }) => c);
}
