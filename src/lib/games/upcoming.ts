// 출시예정 화면의 달 탭 띠가 쓰는 순수 함수.
//
// 서버 화면(page)과 클라이언트 띠(upcoming-month-nav)가 같은 규칙을 써야 해서 여기 둔다 —
// "use client" 파일에서 내보낸 함수는 서버 컴포넌트에서 평범한 함수로 부를 수 없다.
//
// 2026-10-07: 달마다 닻(#m2026-10)으로 내려가던 한 화면짜리를 걷고, 고른 달 하나를 ?month= 로 세운다
// (services/games/upcoming 의 UPCOMING_PAGE_SIZE 주석). 스크롤 위치로 "지금 읽는 달" 을 재던 함수도 같이 걷었다.
import { ROUTES } from "@/lib/routes";

/** 달을 고르는 주소 값의 이름 */
export const UPCOMING_MONTH_PARAM = "month";

/** 그 달을 세운 출시예정 주소. 첫 달(기본)은 꼬리 없이 둔다 — 같은 화면이 늘 같은 주소여야 캐시가 쪼개지지 않는다 */
export function upcomingMonthHref(key: string, firstKey: string | undefined): string {
  return key === firstKey ? ROUTES.upcoming : `${ROUTES.upcoming}?${UPCOMING_MONTH_PARAM}=${key}`;
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
