// 레이아웃용 가드 — proxy(쿠키 유무)만 믿지 않고 세션을 실제 검증해 없으면 로그인으로 보낸다(§6). next에 현재 경로를 실어 돌아오게 한다.
import "server-only";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import type { Role } from "@/server/db/schema";
import { ROUTES, signInPath } from "@/lib/routes";
import { PATHNAME_HEADER } from "@/proxy";
import { getCurrentUser, type UserRow } from "@/server/services/users";
import { findShopStaffRole, type ShopStaffRole } from "@/server/services/shops";

async function currentPath(): Promise<string | null> {
  return (await headers()).get(PATHNAME_HEADER);
}

/** 비로그인(또는 만료 쿠키)이면 로그인 페이지로 redirect. 반환 시점엔 항상 사용자 존재 */
export async function requireUserOrRedirect(): Promise<UserRow> {
  const user = await getCurrentUser().catch(() => null);
  if (!user) redirect(signInPath(await currentPath()));
  return user;
}

/** role 미달이면 403 */
export async function requireRoleOrForbid(...roles: Role[]): Promise<UserRow> {
  const user = await requireUserOrRedirect();
  if (!roles.includes(user.role)) redirect(ROUTES.forbidden);
  return user;
}

/**
 * 매장 단위 권한. 전역 role 만 보는 requireRoleOrForbid 로는 **남의 매장**을 막지 못한다 —
 * seller 면 누구나 폼에 남의 shopId 를 박아 보낼 수 있고, 그것이 이 도메인의 첫 공격이다.
 *
 * 관리자는 항상 통과한다(설계서 §10). 대신 그 행위는 감사 컬럼에 `admin` 으로 남아야 하므로
 * 호출부가 `isAdminOverride` 를 보고 출처를 정한다.
 */
export type ShopAccess = { user: UserRow; role: ShopStaffRole | null; isAdminOverride: boolean };

export async function requireShopRole(shopId: string, ...roles: ShopStaffRole[]): Promise<ShopAccess> {
  const user = await requireUserOrRedirect();
  if (user.role === "admin") return { user, role: null, isAdminOverride: true };

  const role = await findShopStaffRole(shopId, user.id);
  if (!role || (roles.length > 0 && !roles.includes(role))) redirect(ROUTES.forbidden);
  return { user, role, isAdminOverride: false };
}
