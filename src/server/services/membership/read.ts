// 멤버십 읽기(2026-10-27) — 내 멤버십 화면, 광고 걸기 판의 이용권, 관리자 목록. 빌링키는 DTO 로 내보내지 않는다.
import "server-only";
import { desc, eq, inArray, sql, type SQL } from "drizzle-orm";
import type { AnyPgColumn } from "drizzle-orm/pg-core";
import { getDb } from "@/server/db/client";
import { memberships, users, type MembershipStatus } from "@/server/db/schema";
import { BENEFIT_STATUSES, canUseBenefits, MEMBERSHIP_PLANS, type MembershipPlanKey } from "@/lib/membership/plan";

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

/**
 * 그 사람이 지금 멤버십 혜택을 받나(통계 자세히, 메이커 꼬리표, 플레이테스트 고정). lib/membership/plan 의 canUseBenefits 와 같은 문턱을 SQL 로 —
 * 목록 질의가 글쓴이마다 따로 묻지 않고 한 번에 거른다. 두 곳이 어긋나면 꼬리표는 붙었는데 통계는 잠기는 날이 온다
 */
export function makerActiveSql(userIdCol: AnyPgColumn | SQL): SQL<boolean> {
  return sql<boolean>`exists (select 1 from ${memberships} where ${memberships.userId} = ${userIdCol} and ${inArray(memberships.status, [...BENEFIT_STATUSES])} and ${memberships.currentPeriodEnd} > now())`;
}

export async function hasMakerBenefits(userId: string): Promise<boolean> {
  const [m] = await getDb().select({ status: memberships.status, currentPeriodEnd: memberships.currentPeriodEnd }).from(memberships).where(eq(memberships.userId, userId)).limit(1);
  return m ? canUseBenefits(m, new Date()) : false;
}
