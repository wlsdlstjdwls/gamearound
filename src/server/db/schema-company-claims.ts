// 회사 페이지 관리 신청(2026-11-03, 사용자 지시 "회사가 직접 등록"). 관계자가 신청하고 관리자가 승인하면
// 그 사람이 회사 이름(한글), 소개, 사이트, 나라, 설립 연도, 로고를 고친다.
//
// 왜 승인된 신청 줄이 곧 권한인가: 회사 하나에 담당자가 여럿일 수 있고(개발, 홍보), 사람이 떠나면 그 줄만 내리면 된다.
// companies 에 owner 칸 하나를 두면 둘째 담당자를 받을 자리가 없다.
// 회사가 고친 칸은 data_corrections 로 잠근다 — 위키데이터, IGDB 수집이 다음 회차에 되돌리지 않게(services/company-claims).
import { pgEnum, pgTable, text, timestamp, uuid, index, uniqueIndex } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { auditColumns } from "./audit";
import { companies, users } from "./schema";

export const companyClaimStatusEnum = pgEnum("company_claim_status", ["pending", "approved", "rejected", "withdrawn"]);
export type CompanyClaimStatus = (typeof companyClaimStatusEnum.enumValues)[number];

export const companyClaims = pgTable(
  "company_claims",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id").references(() => companies.id, { onDelete: "cascade" }).notNull(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
    status: companyClaimStatusEnum("status").default("pending").notNull(),
    contactName: text("contact_name").notNull(),
    contactTitle: text("contact_title"),
    /** 회사 도메인 메일이면 심사가 쉽다. 가입 메일과 다를 수 있다 */
    contactEmail: text("contact_email").notNull(),
    /** 관계를 보여 줄 주소(공식 사이트의 팀 소개, 스토어 개발사 페이지 등) */
    evidenceUrl: text("evidence_url"),
    note: text("note"),
    /** 반려 사유 */
    statusReason: text("status_reason"),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    reviewedBy: uuid("reviewed_by").references(() => users.id),
    ...auditColumns(),
  },
  (t) => [
    index("company_claims_status_idx").on(t.status, t.createdAt),
    index("company_claims_user_idx").on(t.userId),
    // 같은 사람이 같은 회사에 심사 중 신청을 둘 낼 수 없다
    uniqueIndex("company_claims_pending_uq").on(t.companyId, t.userId).where(sql`status = 'pending'`),
  ],
);
