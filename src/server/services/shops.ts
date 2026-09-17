// 매장 서비스 — 설계서 `docs/기획_매장_상품관리_회원_2026-09-17.md` §3, §9, §10.
//
// 이 계층이 답하는 것은 둘이다: "이 사람이 이 매장을 만질 수 있나", "내가 속한 매장은 어디인가".
// 라우트는 SQL 을 직접 쓰지 않는다(AGENTS §1).
import "server-only";
import { and, desc, eq } from "drizzle-orm";
import { getDb } from "@/server/db/client";
import { shops, shopStaff } from "@/server/db/schema";

export type ShopRow = typeof shops.$inferSelect;
export type ShopStaffRole = typeof shopStaff.$inferSelect["role"];

/** 매장 목록, 매장 페이지가 쓰는 DTO. Drizzle 행 타입을 화면까지 흘리지 않는다(AGENTS §1) */
export type ShopSummary = {
  id: string;
  slug: string;
  name: string;
  status: ShopRow["status"];
  shopType: ShopRow["shopType"];
  addressType: ShopRow["addressType"];
  address: string | null;
  phone: string | null;
};

function toSummary(row: ShopRow): ShopSummary {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    status: row.status,
    shopType: row.shopType,
    addressType: row.addressType,
    address: row.address,
    phone: row.phone,
  };
}

/** 이 사람이 이 매장에서 가진 역할. 소속이 아니면 null */
export async function findShopStaffRole(shopId: string, userId: string): Promise<ShopStaffRole | null> {
  const db = getDb();
  const row = await db
    .select({ role: shopStaff.role })
    .from(shopStaff)
    .where(and(eq(shopStaff.shopId, shopId), eq(shopStaff.userId, userId)))
    .limit(1);
  return row[0]?.role ?? null;
}

/** 내가 속한 매장. `/vendor` 첫 화면이 이걸로 갈래를 정한다(한 곳이면 바로 넘긴다) */
export async function listMyShops(userId: string): Promise<Array<ShopSummary & { role: ShopStaffRole }>> {
  const db = getDb();
  const rows = await db
    .select({ shop: shops, role: shopStaff.role })
    .from(shopStaff)
    .innerJoin(shops, eq(shops.id, shopStaff.shopId))
    .where(eq(shopStaff.userId, userId))
    .orderBy(desc(shops.createdAt));
  return rows.map((r) => ({ ...toSummary(r.shop), role: r.role }));
}

/** slug 로 매장 하나. 공개 화면은 승인된 매장만 봐야 하므로 호출부가 status 를 확인한다 */
export async function findShopBySlug(slug: string): Promise<ShopRow | null> {
  const db = getDb();
  const rows = await db.select().from(shops).where(eq(shops.slug, slug)).limit(1);
  return rows[0] ?? null;
}
