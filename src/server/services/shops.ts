// 매장 서비스 — 설계서 `docs/기획_매장_상품관리_회원_2026-09-17.md` §3, §9, §10.
//
// 이 계층이 답하는 것은 둘이다: "이 사람이 이 매장을 만질 수 있나", "내가 속한 매장은 어디인가".
// 라우트는 SQL 을 직접 쓰지 않는다(AGENTS §1).
import "server-only";
import { and, desc, eq, ne } from "drizzle-orm";
import { getDb } from "@/server/db/client";
import { shops, shopStaff, users } from "@/server/db/schema";
import { createdBy, updatedBy } from "@/server/db/audit";
import { requireUser } from "@/server/services/users";
import { SHOP_MESSAGES } from "@/lib/shops/messages";
import { normalizeBizRegNo, normalizePhone, type ShopApplicationInput, type ShopReviewInput } from "@/lib/shops/schemas";

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

/**
 * 입점 신청 — 설계서 §11. 심사는 사람이 하고 이 계층은 사실만 남긴다.
 *
 * 신청서를 별도 표로 두지 않는 이유: 신청서가 곧 매장이다(`status = 'pending'`).
 * 표를 나누면 승인할 때 값을 한 벌 옮겨 적어야 하고, 그 순간 두 표가 어긋날 자리가 생긴다.
 * 반려도 행을 지우지 않고 사유를 남긴 채 둔다 — 같은 사람이 고쳐서 다시 낼 때 그 행을 고친다.
 */
export type ShopApplication = ShopSummary & {
  statusReason: string | null;
  bizRegNo: string | null;
  description: string | null;
  appliedAt: Date;
  ownerEmail: string | null;
};

/** 심사 화면이 쓰는 모양. 대표 계정 이메일은 관리자만 본다 */
function toApplication(row: ShopRow, ownerEmail: string | null): ShopApplication {
  return {
    ...toSummary(row),
    statusReason: row.statusReason,
    bizRegNo: row.bizRegNo,
    description: row.description,
    appliedAt: row.createdAt,
    ownerEmail,
  };
}

/** 이 사람이 대표로 있는 매장. 한 사람이 매장을 여럿 내는 길은 아직 없다(설계서 §9) */
export async function findMyShop(userId: string): Promise<ShopApplication | null> {
  const db = getDb();
  const rows = await db
    .select()
    .from(shops)
    .where(eq(shops.ownerUserId, userId))
    .orderBy(desc(shops.createdAt))
    .limit(1);
  return rows[0] ? toApplication(rows[0], null) : null;
}

/** 이미 쓰고 있는 주소인가. 신청 전에 물어 폼에서 바로 답한다 */
export async function isShopSlugTaken(slug: string): Promise<boolean> {
  const db = getDb();
  const rows = await db.select({ id: shops.id }).from(shops).where(eq(shops.slug, slug)).limit(1);
  return rows.length > 0;
}

/**
 * 신청서를 낸다. 매장 행이 `pending` 으로 생긴다.
 *
 * 반려된 행이 있으면 그 행을 고쳐서 다시 낸다 — 새 행을 만들면 심사 이력이 흩어지고
 * 관리자 화면에 같은 매장이 여러 줄로 선다.
 */
export async function applyForShop(input: ShopApplicationInput): Promise<ShopApplication> {
  const user = await requireUser();
  const db = getDb();
  const mine = await findMyShop(user.id);
  // 고쳐서 다시 낼 수 있는 것은 **반려된 신청서뿐**이다. 반려는 사유를 남긴 채 pending 으로 돌아오므로
  // "pending 인데 사유가 있다" 가 곧 반려다(reviewShop). 심사 중, 운영 중, 정지는 사람이 손댈 자리가 아니다
  const rejected = mine !== null && mine.status === "pending" && mine.statusReason !== null;
  if (mine && !rejected) throw new Error(SHOP_MESSAGES.alreadyApplied);

  const slug = input.slug.toLowerCase();
  const taken = await db
    .select({ id: shops.id })
    .from(shops)
    .where(and(eq(shops.slug, slug), mine ? ne(shops.id, mine.id) : undefined))
    .limit(1);
  if (taken.length > 0) throw new Error(SHOP_MESSAGES.slugTaken);

  const values = {
    shopType: input.shopType,
    slug,
    name: input.name,
    ownerUserId: user.id,
    bizRegNo: input.shopType === "business" ? normalizeBizRegNo(input.bizRegNo ?? "") : null,
    addressType: input.addressType,
    address: input.address || null,
    addressDetail: input.addressDetail || null,
    phone: input.phone ? normalizePhone(input.phone) : null,
    description: input.description || null,
    status: "pending" as const,
    // 다시 낸 신청서에는 옛 반려 사유가 남아 있으면 안 된다 — 화면이 "반려됨" 으로 읽는다
    statusReason: null,
  };

  if (mine) {
    await db.update(shops).set({ ...values, ...updatedBy("user", user.id) }).where(eq(shops.id, mine.id));
  } else {
    await db.insert(shops).values({ ...values, ...createdBy("user", user.id) });
  }
  const saved = await findMyShop(user.id);
  if (!saved) throw new Error(SHOP_MESSAGES.badRequest);
  return saved;
}

/** 심사 화면의 목록. 상태별로 갈라 보는 화면이라 상태를 받는다 */
export async function listShopsByStatus(status: ShopRow["status"]): Promise<ShopApplication[]> {
  const db = getDb();
  const rows = await db
    .select({ shop: shops, ownerEmail: users.email })
    .from(shops)
    .leftJoin(users, eq(users.id, shops.ownerUserId))
    .where(eq(shops.status, status))
    .orderBy(desc(shops.createdAt));
  return rows.map((r) => toApplication(r.shop, r.ownerEmail));
}

/**
 * 심사 결정. 승인은 세 곳을 동시에 바꾼다 — 매장 상태, 대표의 계정 역할, 직원 표의 owner 행.
 *
 * 왜 한 번에 보내나(`db.batch`): 셋 중 하나만 성공하면 "승인된 매장인데 주인이 못 들어가는" 상태가 된다.
 * neon-http 는 대화형 트랜잭션이 없지만 batch 는 한 트랜잭션으로 간다.
 *
 * 관리자가 한 일은 감사 컬럼에 `admin` 으로 남는다(설계서 §10) — 매장주가 나중에
 * "내가 안 했는데" 라고 할 때 답이 되는 것이 그 한 줄이다.
 */
export async function reviewShop(input: ShopReviewInput, admin: { id: string }): Promise<void> {
  const db = getDb();
  const rows = await db.select().from(shops).where(eq(shops.id, input.shopId)).limit(1);
  const shop = rows[0];
  if (!shop) throw new Error(SHOP_MESSAGES.badRequest);

  const stamp = updatedBy("admin", admin.id);
  if (input.decision === "approve") {
    await db.batch([
      db
        .update(shops)
        .set({ status: "active", statusReason: null, approvedAt: new Date(), approvedBy: admin.id, ...stamp })
        .where(eq(shops.id, shop.id)),
      db
        .insert(shopStaff)
        .values({ shopId: shop.id, userId: shop.ownerUserId, role: "owner", invitedBy: admin.id, ...createdBy("admin", admin.id) })
        .onConflictDoNothing(),
      // 이미 관리자인 사람을 판매자로 내리지 않는다 — 역할은 한 칸이라 덮어쓰면 권한을 잃는다
      db
        .update(users)
        .set({ role: "seller" })
        .where(and(eq(users.id, shop.ownerUserId), eq(users.role, "user"))),
    ]);
    return;
  }

  const status = input.decision === "reactivate" ? "active" : input.decision === "suspend" ? "suspended" : "pending";
  await db
    .update(shops)
    // 반려는 행을 지우지 않고 사유를 남긴 채 pending 으로 되돌린다 — 고쳐서 다시 낼 자리가 그 행이다
    .set({ status, statusReason: input.reason ?? null, ...stamp })
    .where(eq(shops.id, shop.id));
}
