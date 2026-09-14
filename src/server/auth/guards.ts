// 레이아웃용 가드 — proxy(쿠키 유무)만 믿지 않고 세션을 실제 검증해 없으면 로그인으로 보낸다(§6). next에 현재 경로를 실어 돌아오게 한다.
import "server-only";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import type { Role } from "@/server/db/schema";
import { ROUTES, signInPath } from "@/lib/routes";
import { PATHNAME_HEADER } from "@/proxy";
import { getCurrentUser, type UserRow } from "@/server/services/users";

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
