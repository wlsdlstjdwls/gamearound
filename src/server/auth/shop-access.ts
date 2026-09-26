// 매장 콘솔 서버 액션의 앞머리 — slug 로 매장을 찾고, 매장 단위 권한을 보고, 감사 출처를 정한다.
//
// 판매 목록과 직원 화면이 같은 세 줄을 쓴다(AGENTS §3, 두 곳이면 뽑는다). 한 액션이라도 이걸 빠뜨리면
// 그 액션 하나가 남의 매장에 열린다 — 폼에 남의 shopId 를 박아 보내는 것이 이 도메인의 첫 공격이다(설계서 §10).
import "server-only";
import type { AuditSource } from "@/server/db/audit";
import { requireShopRole, type ShopAccess } from "@/server/auth/guards";
import { findShopBySlug, type ShopRow, type ShopStaffRole } from "@/server/services/shops";

export type ShopActor = { source: AuditSource; userId: string };

/**
 * 관리자가 대신 고친 일은 감사 컬럼에 `admin` 으로 남는다. 매장이 고친 일은 `shop:{id}` 다 —
 * 나중에 "내가 안 했는데" 라는 말이 나올 때 답이 되는 것이 그 한 줄이다(설계서 §10).
 */
export async function openShopForAction(
  shopSlug: string,
  notFoundMessage: string,
  ...roles: ShopStaffRole[]
): Promise<{ shop: ShopRow; access: ShopAccess; actor: ShopActor }> {
  const shop = await findShopBySlug(shopSlug);
  if (!shop) throw new Error(notFoundMessage);
  const access = await requireShopRole(shop.id, ...roles);
  const actor: ShopActor = access.isAdminOverride
    ? { source: "admin", userId: access.user.id }
    : { source: `shop:${shop.id}`, userId: access.user.id };
  return { shop, access, actor };
}
