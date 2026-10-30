// 로그인이 필요한 자리에서 "어느 로그인 화면으로 보낼지" 를 정한다. proxy(쿠키 없음)와 레이아웃 가드(세션 무효) 둘이 같은 답을 내야 해서 여기 한곳에 둔다.
//
// 관리자 영역(/admin, /shops/admin)은 관리자 로그인으로, 나머지는 회원 로그인으로 보낸다(2026-10-30 사용자 "관리자 로그인 화면은 분리").
// 관리자 계정이 회원 로그인으로 들어오는 길은 막지 않는다 — 막는 것은 관리자 로그인에 관리자 아닌 계정이 들어오는 쪽뿐이다(actions 의 adminSignInAction).
import { ADMIN_ROUTE_PREFIXES } from "@/lib/auth/constants";
import { ROUTES, safeNextPath, signInPath } from "@/lib/routes";

/** 주소(쿼리 포함 가능)가 관리자 영역인가. 관리자 로그인 화면 자체는 영역 밖이다 — 안이면 자기 자신으로 끝없이 돌려보낸다 */
export function isAdminAreaPath(path: string | null | undefined): boolean {
  if (!path) return false;
  const pathname = path.split(/[?#]/, 1)[0];
  if (pathname === ROUTES.adminSignIn || pathname.startsWith(`${ROUTES.adminSignIn}/`)) return false;
  return ADMIN_ROUTE_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

/** 관리자 로그인 뒤 갈 곳. 관리자 영역 밖 주소는 받지 않는다 — 이 화면에서 로그인한 사람이 갈 곳은 관리자 화면뿐이다 */
export function adminNextPath(raw: string | null | undefined): string {
  const safe = safeNextPath(raw);
  return isAdminAreaPath(safe) ? safe : ROUTES.admin;
}

/** 돌아갈 경로를 붙인 관리자 로그인 주소. 관리자 첫 화면이면 붙이지 않는다 */
export function adminSignInPath(next?: string | null): string {
  const target = adminNextPath(next);
  return target === ROUTES.admin ? ROUTES.adminSignIn : `${ROUTES.adminSignIn}?next=${encodeURIComponent(target)}`;
}

/** 로그인이 필요한 주소에서 보낼 로그인 화면 */
export function signInPathFor(path: string | null | undefined): string {
  return isAdminAreaPath(path) ? adminSignInPath(path) : signInPath(path);
}
