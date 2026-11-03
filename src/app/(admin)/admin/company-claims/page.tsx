// /admin/company-claims — 회사관리신청관리(2026-11-03). 회사 관계자가 낸 회사 페이지 관리 신청을 승인, 반려한다.
// 승인된 사람은 /companies/<slug>/manage 에서 회사 정보를 고친다(services/company-claims).
// 화면 구성은 입점승인관리와 같은 승인 화면 꼴(components/admin/company-claims-screen).
import type { Metadata } from "next";
import { AdminScreenHead } from "@/components/admin/screen/head";
import { CompanyClaimsScreen } from "@/components/admin/company-claims-screen";
import { ADMIN_NAV } from "@/lib/admin/messages";
import { COMPANY_CLAIM_ADMIN_MESSAGES as A } from "@/lib/companies/messages";
import { ROUTES } from "@/lib/routes";
import { requireRoleOrForbid } from "@/server/auth/guards";
import { listCompanyClaims } from "@/server/services/company-claims";
import type { CompanyClaimStatus } from "@/server/db/schema";

export const metadata: Metadata = { title: ADMIN_NAV.companyClaims };
// 심사 화면은 늘 지금 값을 봐야 한다
export const dynamic = "force-dynamic";

const STATUSES: Array<{ status: CompanyClaimStatus; label: string }> = [
  { status: "pending", label: A.pendingTab },
  { status: "approved", label: A.approvedTab },
  { status: "rejected", label: A.rejectedTab },
  { status: "withdrawn", label: A.withdrawnTab },
];

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function AdminCompanyClaimsPage({ searchParams }: Props) {
  await requireRoleOrForbid("admin");
  const raw = (await searchParams).status;
  const picked = Array.isArray(raw) ? raw[0] : raw;
  const status = STATUSES.find((s) => s.status === picked)?.status ?? "pending";
  const rows = await listCompanyClaims(status);

  return (
    <>
      <AdminScreenHead title={ADMIN_NAV.companyClaims} count={rows.length} />
      <CompanyClaimsScreen
        key={status}
        rows={rows}
        status={status}
        statuses={STATUSES.map((s) => ({
          value: s.status,
          label: s.label,
          href: s.status === "pending" ? ROUTES.adminCompanyClaims : `${ROUTES.adminCompanyClaims}?status=${s.status}`,
        }))}
      />
    </>
  );
}
