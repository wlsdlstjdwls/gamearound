// 멤버십 읽기(2026-10-27) — 내 멤버십 화면, 광고 걸기 판의 이용권, 관리자 목록. 빌링키는 DTO 로 내보내지 않는다.
import "server-only";
import { desc, eq } from "drizzle-orm";
import { getDb } from "@/server/db/client";
import { memberships, users, type MembershipStatus } from "@/server/db/schema";
import { canUseBenefits, MEMBERSHIP_PLANS, type MembershipPlanKey } from "@/lib/membership/plan";

/** 관리자 목록 한 화면 */
const ADMIN_LIST_LIMIT = 100;

export type MembershipDto = {
  status: MembershipStatus;
  planName: string;
  amount: number;
  cardLabel: string | null;
  periodStart: Date;
  periodEnd: Date;
  nextChargeAt: Date | null;
  /** 지금 쓸 수 있는 이용권. 기간 밖이거나 결제 실패 중이면 0 */
  usableCredits: number;
  failedAttempts: number;
  lastFailMessage: string | null;
  email?: string;
};

function toDto(m: typeof memberships.$inferSelect, now: Date, email?: string): MembershipDto {
  const plan = MEMBERSHIP_PLANS[m.plan as MembershipPlanKey];
  return {
    status: m.status,
    planName: plan?.name ?? m.plan,
    amount: plan?.amount ?? 0,
    cardLabel: m.cardLabel,
    periodStart: m.currentPeriodStart,
    periodEnd: m.currentPeriodEnd,
    nextChargeAt: m.nextChargeAt,
    usableCredits: canUseBenefits(m, now) ? m.boostCredits : 0,
    failedAttempts: m.failedAttempts,
    lastFailMessage: m.lastFailMessage,
    email,
  };
}

export async function getMyMembership(userId: string): Promise<MembershipDto | null> {
  const [m] = await getDb().select().from(memberships).where(eq(memberships.userId, userId)).limit(1);
  return m ? toDto(m, new Date()) : null;
}

/** 관리자 목록. 최근에 바뀐 것부터 */
export async function listMembershipsForAdmin(): Promise<MembershipDto[]> {
  const rows = await getDb()
    .select({ m: memberships, email: users.email })
    .from(memberships)
    .innerJoin(users, eq(users.id, memberships.userId))
    .orderBy(desc(memberships.updatedAt))
    .limit(ADMIN_LIST_LIMIT);
  const now = new Date();
  return rows.map(({ m, email }) => toDto(m, now, email));
}
