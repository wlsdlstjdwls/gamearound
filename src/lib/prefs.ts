// 다음 접속에도 남는 보기 고르기(2026-10-27, 사용자: "한 번 누르면 다음에 접속해도 그 버튼이 눌려 있게").
//
// 쿠키에 둔다 — 서버가 첫 렌더에서 읽어야 "기본값으로 그렸다가 저장값으로 한 번 바뀌는" 깜빡임이 없다.
// localStorage 는 서버가 못 읽는다. 계정 테이블에 두지 않는 이유: 로그인하지 않은 사람도 같은 편의를 받아야 하고,
// 보기 하나 바꿀 때마다 DB 를 쓰면 Neon 왕복이 는다(memory: Neon 왕복 비용).
// 쿠키는 주소에 값이 **명시**됐을 때만 쓴다(components/remember-pref). 주소가 비면 쿠키를 읽어 그 보기로 연다.

/** 쿠키 이름. 앞머리 pref_ 로 모아 두면 지울 때 한 번에 찾는다 */
export const PREF_COOKIES = {
  /** 출시 예정 전체/월별 보기(app/(public)/upcoming) */
  upcomingView: "pref_upcoming_view",
  /** 찜 목록 정렬(app/(user)/wishlist) */
  wishlistSort: "pref_wishlist_sort",
} as const;
export type PrefCookie = (typeof PREF_COOKIES)[keyof typeof PREF_COOKIES];

/** 1년. 보기 취향은 자주 바뀌지 않는다 — 짧으면 "또 풀렸다" 로 읽힌다 */
export const PREF_MAX_AGE_SEC = 60 * 60 * 24 * 365;

/** 쿠키 값이 허용된 값 중 하나일 때만 돌려준다. 손으로 고친 값, 옛 값은 없는 것으로 본다 */
export function readPref<T extends string>(raw: string | undefined, allowed: readonly T[]): T | undefined {
  return raw && (allowed as readonly string[]).includes(raw) ? (raw as T) : undefined;
}
