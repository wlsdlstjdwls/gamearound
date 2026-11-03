// 회사 페이지 관리 — 관계자 신청, 관리자 심사, 승인된 관계자의 회사 정보 고치기(2026-11-03).
//
// 권한은 "승인된 신청 줄" 하나로 정한다(schema-company-claims 머리 주석). 관리자는 늘 통과한다.
// 고친 칸은 data_corrections 로 잠근다 — 위키데이터, IGDB 수집이 null 아닌 값으로 다음 회차에 덮어쓰지 않게(sync 는 잠금을 지킨다).
import "server-only";
import { and, desc, eq, inArray } from "drizzle-orm";
import { getDb } from "@/server/db/client";
import { companies, companyClaims, dataCorrections, users, type CompanyClaimStatus } from "@/server/db/schema";
import { createdBy, updatedBy } from "@/server/db/audit";
import { dropCachedSessionsOfUser } from "@/server/auth/session-cache";
import type { UserRow } from "@/server/services/users";
import { COMPANY_CLAIM_ADMIN_MESSAGES as A, COMPANY_CLAIM_MESSAGES as C, COMPANY_MANAGE_MESSAGES as G } from "@/lib/companies/messages";
import { companyLogoPrefix, type CompanyClaimInput, type CompanyClaimReviewInput, type CompanyManageInput } from "@/lib/companies/schemas";
import { countryNameKo } from "@/lib/companies/countries";

export type CompanyBrief = { id: string; slug: string; name: string };

export type MyCompanyClaim = {
  id: string;
  status: CompanyClaimStatus;
  statusReason: string | null;
  contactName: string;
  contactTitle: string | null;
  contactEmail: string;
  evidenceUrl: string | null;
  note: string | null;
};

export type CompanyClaimRow = MyCompanyClaim & {
  companySlug: string;
  companyName: string;
  applicantEmail: string | null;
  applicantName: string | null;
  appliedAt: Date;
  reviewedAt: Date | null;
};

export async function findCompanyBrief(slug: string): Promise<CompanyBrief | null> {
  const [row] = await getDb()
    .select({ id: companies.id, slug: companies.slug, nameEn: companies.nameEn, nameKo: companies.nameKo })
    .from(companies)
    .where(eq(companies.slug, slug))
    .limit(1);
  return row ? { id: row.id, slug: row.slug, name: row.nameKo ?? row.nameEn } : null;
}

const claimCols = {
  id: companyClaims.id,
  status: companyClaims.status,
  statusReason: companyClaims.statusReason,
  contactName: companyClaims.contactName,
  contactTitle: companyClaims.contactTitle,
  contactEmail: companyClaims.contactEmail,
  evidenceUrl: companyClaims.evidenceUrl,
  note: companyClaims.note,
};

/** 이 사람이 이 회사에 낸 가장 최근 신청(취소한 것은 빼고) */
export async function findMyCompanyClaim(companyId: string, userId: string): Promise<MyCompanyClaim | null> {
  const [row] = await getDb()
    .select(claimCols)
    .from(companyClaims)
    .where(and(eq(companyClaims.companyId, companyId), eq(companyClaims.userId, userId), inArray(companyClaims.status, ["pending", "approved", "rejected"])))
    .orderBy(desc(companyClaims.createdAt))
    .limit(1);
  return row ?? null;
}

export async function applyCompanyClaim(company: CompanyBrief, user: UserRow, input: CompanyClaimInput): Promise<void> {
  const mine = await findMyCompanyClaim(company.id, user.id);
  if (mine?.status === "pending") throw new Error(C.alreadyPending);
  if (mine?.status === "approved") throw new Error(C.alreadyApproved);
  await getDb()
    .insert(companyClaims)
    .values({ companyId: company.id, userId: user.id, ...input, ...createdBy("user", user.id) });
}

export async function withdrawCompanyClaim(companyId: string, user: UserRow): Promise<void> {
  await getDb()
    .update(companyClaims)
    .set({ status: "withdrawn", ...updatedBy("user", user.id) })
    .where(and(eq(companyClaims.companyId, companyId), eq(companyClaims.userId, user.id), eq(companyClaims.status, "pending")));
}

/** 이 회사 정보를 고칠 수 있나. 관리자이거나 승인된 신청이 있는 사람 */
export async function canManageCompany(companyId: string, user: UserRow): Promise<boolean> {
  if (user.role === "admin") return true;
  const [row] = await getDb()
    .select({ id: companyClaims.id })
    .from(companyClaims)
    .where(and(eq(companyClaims.companyId, companyId), eq(companyClaims.userId, user.id), eq(companyClaims.status, "approved")))
    .limit(1);
  return Boolean(row);
}

export type CompanyEditable = {
  id: string;
  slug: string;
  name: string;
  nameKo: string | null;
  description: string | null;
  websiteUrl: string | null;
  countryCode: string | null;
  foundedYear: number | null;
  logoUrl: string | null;
};

export async function getCompanyEditable(slug: string): Promise<CompanyEditable | null> {
  const [c] = await getDb().select().from(companies).where(eq(companies.slug, slug)).limit(1);
  if (!c) return null;
  return {
    id: c.id,
    slug: c.slug,
    name: c.nameKo ?? c.nameEn,
    nameKo: c.nameKo,
    description: c.description,
    websiteUrl: c.websiteUrl,
    countryCode: c.countryCode,
    foundedYear: c.foundedAt ? Number(c.foundedAt.slice(0, 4)) : null,
    logoUrl: c.logoUrl,
  };
}

/** 로고 주소는 우리 Blob 의 이 회사 경로이거나 지금 값이어야 한다 — 남의 그림 주소를 박는 길을 막는다 */
function logoAllowed(url: string | null, companyId: string, current: string | null): boolean {
  if (url === null || url === current) return true;
  try {
    return new URL(url).pathname.startsWith(`/${companyLogoPrefix(companyId)}`);
  } catch {
    return false;
  }
}

/** 회사 정보 저장. 달라진 칸만 고치고 그 칸을 잠근다. 바뀐 칸 수를 돌려준다 */
export async function updateCompanyByManager(slug: string, user: UserRow, input: CompanyManageInput): Promise<number> {
  const db = getDb();
  const current = await getCompanyEditable(slug);
  if (!current) throw new Error(C.companyNotFound);
  if (!(await canManageCompany(current.id, user))) throw new Error(G.forbidden);
  if (!logoAllowed(input.logoUrl, current.id, current.logoUrl)) throw new Error(G.logoFailed);

  const next: Partial<typeof companies.$inferInsert> = {};
  const locks: Array<{ field: string; before: unknown; after: unknown }> = [];
  const take = <K extends keyof typeof companies.$inferInsert>(field: K, before: unknown, after: (typeof companies.$inferInsert)[K]) => {
    if (before === after) return;
    next[field] = after;
    locks.push({ field, before, after });
  };
  take("nameKo", current.nameKo, input.nameKo);
  take("description", current.description, input.description);
  take("websiteUrl", current.websiteUrl, input.websiteUrl);
  take("logoUrl", current.logoUrl, input.logoUrl);
  if (current.countryCode !== input.countryCode) {
    take("countryCode", current.countryCode, input.countryCode);
    next.countryNameKo = input.countryCode ? countryNameKo(input.countryCode) : null;
    locks.push({ field: "countryNameKo", before: null, after: next.countryNameKo });
  }
  if (current.foundedYear !== input.foundedYear) {
    take("foundedAt", current.foundedYear, input.foundedYear ? `${input.foundedYear}-01-01` : null);
  }
  if (locks.length === 0) return 0;

  const source = user.role === "admin" ? "admin" : "user";
  await db.update(companies).set({ ...next, ...updatedBy(source, user.id) }).where(eq(companies.id, current.id));
  // 같은 칸의 옛 잠금은 지우고 새로 건다 — 한 칸에 잠금 줄이 쌓이면 "언제 누가 마지막으로 정했나" 가 흐려진다
  await db
    .delete(dataCorrections)
    .where(and(eq(dataCorrections.table, "companies"), eq(dataCorrections.rowId, current.id), inArray(dataCorrections.field, locks.map((l) => l.field))));
  await db.insert(dataCorrections).values(
    locks.map((l) => ({
      adminUserId: user.id,
      table: "companies",
      rowId: current.id,
      field: l.field,
      before: l.before,
      after: l.after,
      lockField: true,
      ...createdBy(source, user.id),
    })),
  );
  return locks.length;
}

// ---- 관리자 심사 ----

export async function listCompanyClaims(status: CompanyClaimStatus): Promise<CompanyClaimRow[]> {
  const rows = await getDb()
    .select({
      ...claimCols,
      companySlug: companies.slug,
      companyNameEn: companies.nameEn,
      companyNameKo: companies.nameKo,
      applicantEmail: users.email,
      applicantName: users.displayName,
      appliedAt: companyClaims.createdAt,
      reviewedAt: companyClaims.reviewedAt,
    })
    .from(companyClaims)
    .innerJoin(companies, eq(companies.id, companyClaims.companyId))
    .leftJoin(users, eq(users.id, companyClaims.userId))
    .where(eq(companyClaims.status, status))
    .orderBy(desc(companyClaims.createdAt));
  return rows.map(({ companyNameEn, companyNameKo, ...r }) => ({ ...r, companyName: companyNameKo ?? companyNameEn }));
}

export async function countPendingCompanyClaims(): Promise<number> {
  const rows = await getDb().select({ id: companyClaims.id }).from(companyClaims).where(eq(companyClaims.status, "pending"));
  return rows.length;
}

/** 승인, 반려. 승인하면 일반 회원은 게임사 회원(game_company)이 된다 — 다른 역할(판매자, 관리자)은 그대로 둔다 */
export async function reviewCompanyClaim(input: CompanyClaimReviewInput, admin: { id: string }): Promise<string> {
  const db = getDb();
  const [claim] = await db
    .select({ id: companyClaims.id, userId: companyClaims.userId, status: companyClaims.status, companySlug: companies.slug })
    .from(companyClaims)
    .innerJoin(companies, eq(companies.id, companyClaims.companyId))
    .where(eq(companyClaims.id, input.claimId))
    .limit(1);
  if (!claim || claim.status !== "pending") throw new Error(A.notPending);
  const approve = input.decision === "approve";
  await db
    .update(companyClaims)
    .set({
      status: approve ? "approved" : "rejected",
      statusReason: approve ? null : (input.reason ?? null),
      reviewedAt: new Date(),
      reviewedBy: admin.id,
      ...updatedBy("admin", admin.id),
    })
    .where(and(eq(companyClaims.id, claim.id), eq(companyClaims.status, "pending")));
  if (approve) {
    const promoted = await db
      .update(users)
      .set({ role: "game_company", ...updatedBy("admin", admin.id) })
      .where(and(eq(users.id, claim.userId), eq(users.role, "user")))
      .returning({ id: users.id });
    // 세션 사본(Redis)이 옛 역할을 들고 있다 — 지워야 바로 반영된다
    if (promoted.length > 0) await dropCachedSessionsOfUser(claim.userId);
  }
  return claim.companySlug;
}
