// 매장 직원 — 설계서 §9. 초대, 수락, 목록, 내보내기.
//
// 메일을 보내지 않는다. 레포에 메일 수단이 없고(인증 재설정도 같은 이유로 보류다), 매장은
// 알바에게 메신저로 링크를 건네는 쪽이 오히려 빠르다. 그래서 초대를 만들면 **링크 원문을 한 번만**
// 돌려주고, DB 에는 해시만 남긴다(세션과 같은 규칙) — 표가 새도 링크를 되살릴 수 없다.
//
// 링크만 쥐면 들어오는 문을 만들지 않는다. 수락은 초대받은 이메일로 로그인한 사람만 된다
// (lib/shops/staff-schemas 의 judgeInvite). 메신저 단톡방에 링크가 잘못 올라가도 남은 못 쓴다.
//
// 합류해도 전역 역할(users.role)은 안 바꾼다. 매장 권한은 shop_staff 가 정하고(requireShopRole),
// 알바를 seller 로 올리면 그만둔 뒤에도 판매자 표시가 남는다. seller 승격은 입점 승인 한 곳뿐이다.
import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { and, asc, eq, isNull, lte } from "drizzle-orm";
import { getDb } from "@/server/db/client";
import { shops, shopStaff, shopStaffInvites, users } from "@/server/db/schema";
import { createdBy, updatedBy, type AuditSource } from "@/server/db/audit";
import { STAFF_INVITE_TOKEN_BYTES, STAFF_INVITE_TTL_DAYS } from "@/lib/shops/constants";
import { STAFF_MESSAGES } from "@/lib/shops/staff-messages";
import { judgeInvite, normalizeEmail, type StaffInviteInput } from "@/lib/shops/staff-schemas";
import type { ShopStaffRole } from "./core";

type Actor = { source: AuditSource; userId?: string };

const DAY_MS = 24 * 60 * 60 * 1000;

/** 화면이 쓰는 직원 한 줄. Drizzle 행 타입을 화면까지 흘리지 않는다(AGENTS §1) */
export type StaffMemberDto = {
  userId: string;
  email: string;
  displayName: string | null;
  role: ShopStaffRole;
  joinedAt: Date;
};

export type StaffInviteDto = {
  id: string;
  email: string;
  role: ShopStaffRole;
  expiresAt: Date;
  expired: boolean;
};

/** 수락 화면이 보는 초대. 토큰 원문으로만 찾는다 */
export type InviteLookupDto = {
  shopName: string;
  shopSlug: string;
  role: ShopStaffRole;
  email: string;
  expiresAt: Date;
  acceptedAt: Date | null;
};

function hashInviteToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function listStaffMembers(shopId: string): Promise<StaffMemberDto[]> {
  return getDb()
    .select({
      userId: shopStaff.userId,
      email: users.email,
      displayName: users.displayName,
      role: shopStaff.role,
      joinedAt: shopStaff.joinedAt,
    })
    .from(shopStaff)
    .innerJoin(users, eq(users.id, shopStaff.userId))
    .where(eq(shopStaff.shopId, shopId))
    .orderBy(asc(shopStaff.joinedAt));
}

/** 아직 안 받은 초대. 만료된 것도 보여 준다 — 사라지면 대표가 "보냈는데 왜 없지" 를 묻는다 */
export async function listOpenInvites(shopId: string, now = new Date()): Promise<StaffInviteDto[]> {
  const rows = await getDb()
    .select({ id: shopStaffInvites.id, email: shopStaffInvites.email, role: shopStaffInvites.role, expiresAt: shopStaffInvites.expiresAt })
    .from(shopStaffInvites)
    .where(and(eq(shopStaffInvites.shopId, shopId), isNull(shopStaffInvites.acceptedAt)))
    .orderBy(asc(shopStaffInvites.expiresAt));
  return rows.map((r) => ({ ...r, expired: r.expiresAt.getTime() <= now.getTime() }));
}

/**
 * 초대를 만들고 **링크 토큰 원문**을 돌려준다. 원문은 여기서 한 번만 산다.
 *
 * 같은 주소로 살아 있는 초대는 하나뿐이다(`shop_staff_invites_open_uq`). 만료된 옛 초대가 그 자리를
 * 막고 있으면 지우고 새로 만든다 — 막힌 채 두면 대표가 만료된 줄을 먼저 치워야 하는 이유를 모른다.
 */
export async function createStaffInvite(shopId: string, input: StaffInviteInput, actor: Actor): Promise<string> {
  const db = getDb();
  const email = normalizeEmail(input.email);

  const member = await db
    .select({ id: users.id })
    .from(shopStaff)
    .innerJoin(users, eq(users.id, shopStaff.userId))
    .where(and(eq(shopStaff.shopId, shopId), eq(users.email, email)))
    .limit(1);
  if (member[0]) throw new Error(STAFF_MESSAGES.alreadyMember);

  const now = new Date();
  await db
    .delete(shopStaffInvites)
    .where(
      and(
        eq(shopStaffInvites.shopId, shopId),
        eq(shopStaffInvites.email, email),
        isNull(shopStaffInvites.acceptedAt),
        lte(shopStaffInvites.expiresAt, now),
      ),
    );

  const token = randomBytes(STAFF_INVITE_TOKEN_BYTES).toString("base64url");
  try {
    await db.insert(shopStaffInvites).values({
      shopId,
      email,
      role: input.role,
      tokenHash: hashInviteToken(token),
      expiresAt: new Date(now.getTime() + STAFF_INVITE_TTL_DAYS * DAY_MS),
      ...createdBy(actor.source, actor.userId),
    });
  } catch (e) {
    if (String(e).includes("shop_staff_invites_open_uq")) throw new Error(STAFF_MESSAGES.duplicateInvite);
    throw e;
  }
  return token;
}

/** 초대 취소. shopId 를 조건에 함께 넣는다 — 폼에 남의 초대 id 를 박아 보내는 길을 질의가 막는다 */
export async function revokeStaffInvite(inviteId: string, shopId: string): Promise<void> {
  const result = await getDb()
    .delete(shopStaffInvites)
    .where(and(eq(shopStaffInvites.id, inviteId), eq(shopStaffInvites.shopId, shopId), isNull(shopStaffInvites.acceptedAt)))
    .returning({ id: shopStaffInvites.id });
  if (result.length === 0) throw new Error(STAFF_MESSAGES.notFound);
}

/**
 * 직원 내보내기. 대표와 나 자신은 못 내보낸다.
 *
 * 대표를 막는 이유: 대표 행이 사라지면 그 매장을 관리할 사람이 없어지고, 되돌릴 길은 관리자뿐이다.
 * 나 자신을 막는 이유: 매니저가 실수로 제 행을 지우면 그 화면에서 곧장 쫓겨난다.
 */
export async function removeStaffMember(shopId: string, userId: string, actorUserId: string): Promise<void> {
  if (userId === actorUserId) throw new Error(STAFF_MESSAGES.cannotRemoveSelf);
  const db = getDb();
  const rows = await db
    .select({ role: shopStaff.role })
    .from(shopStaff)
    .where(and(eq(shopStaff.shopId, shopId), eq(shopStaff.userId, userId)))
    .limit(1);
  const row = rows[0];
  if (!row) throw new Error(STAFF_MESSAGES.notFound);
  if (row.role === "owner") throw new Error(STAFF_MESSAGES.cannotRemoveOwner);
  await db.delete(shopStaff).where(and(eq(shopStaff.shopId, shopId), eq(shopStaff.userId, userId)));
}

export async function findInviteByToken(token: string): Promise<InviteLookupDto | null> {
  const rows = await getDb()
    .select({
      shopName: shops.name,
      shopSlug: shops.slug,
      role: shopStaffInvites.role,
      email: shopStaffInvites.email,
      expiresAt: shopStaffInvites.expiresAt,
      acceptedAt: shopStaffInvites.acceptedAt,
    })
    .from(shopStaffInvites)
    .innerJoin(shops, eq(shops.id, shopStaffInvites.shopId))
    .where(eq(shopStaffInvites.tokenHash, hashInviteToken(token)))
    .limit(1);
  return rows[0] ?? null;
}

/**
 * 초대를 받아들인다. 합류한 매장의 slug 를 돌려준다(화면이 그 매장 판매 목록으로 보낸다).
 *
 * 직원 행과 초대 수락 표시를 한 번에 쓴다(`db.batch`, neon-http 에서도 한 트랜잭션).
 * 따로 쓰면 "합류는 됐는데 초대가 살아 있어 두 번 쓸 수 있는" 틈이 생긴다.
 */
export async function acceptStaffInvite(token: string, user: { id: string; email: string }): Promise<string> {
  const db = getDb();
  const rows = await db
    .select({ invite: shopStaffInvites, shopSlug: shops.slug })
    .from(shopStaffInvites)
    .innerJoin(shops, eq(shops.id, shopStaffInvites.shopId))
    .where(eq(shopStaffInvites.tokenHash, hashInviteToken(token)))
    .limit(1);
  const hit = rows[0];
  if (!hit) throw new Error(STAFF_MESSAGES.acceptNotFound);

  const verdict = judgeInvite(hit.invite, user.email, new Date());
  if (verdict === "used") throw new Error(STAFF_MESSAGES.acceptUsed);
  if (verdict === "expired") throw new Error(STAFF_MESSAGES.acceptExpired);
  if (verdict === "mismatch") throw new Error(STAFF_MESSAGES.acceptMismatch);

  const { invite } = hit;
  await db.batch([
    // 이미 직원이면(다른 초대로 먼저 들어왔다) 역할을 덮지 않는다 — 대표가 올려 둔 매니저를 staff 로 내리는 일이 생긴다
    db
      .insert(shopStaff)
      .values({ shopId: invite.shopId, userId: user.id, role: invite.role, invitedBy: invite.createdBy, ...createdBy("user", user.id) })
      .onConflictDoNothing(),
    db
      .update(shopStaffInvites)
      .set({ acceptedAt: new Date(), acceptedUserId: user.id, ...updatedBy("user", user.id) })
      .where(eq(shopStaffInvites.id, invite.id)),
  ]);
  return hit.shopSlug;
}
