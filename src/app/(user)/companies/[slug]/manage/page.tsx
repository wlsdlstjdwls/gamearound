// /companies/[slug]/manage — 승인된 관계자(또는 관리자)가 회사 정보를 고치는 화면.
// 권한이 없으면 신청 화면으로 보낸다 — 403 보다 "신청하면 고칠 수 있다" 가 다음 할 일을 말해 준다.
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { CompanyManageForm } from "@/components/companies/manage-form";
import { BackLink } from "@/components/ui/back-link";
import { Page, PageHead } from "@/components/ui/page";
import { COMPANY_CLAIM_MESSAGES as C, COMPANY_MANAGE_MESSAGES as G } from "@/lib/companies/messages";
import { COMPANY_COUNTRY_CODES, countryNameKo } from "@/lib/companies/countries";
import { companyClaimPath, companyPath } from "@/lib/routes";
import { decodeSlugParam } from "@/lib/slug";
import { requireUserOrRedirect } from "@/server/auth/guards";
import { canManageCompany, getCompanyEditable } from "@/server/services/company-claims";

export const metadata: Metadata = { title: G.title, robots: { index: false } };

type Props = { params: Promise<{ slug: string }> };

export default async function CompanyManagePage({ params }: Props) {
  const slug = decodeSlugParam((await params).slug);
  const user = await requireUserOrRedirect();
  const company = await getCompanyEditable(slug);
  if (!company) notFound();
  if (!(await canManageCompany(company.id, user))) redirect(companyClaimPath(company.slug));

  // 나라 이름은 서버에서 한 번 만들어 넘긴다 — 브라우저마다 Intl 판이 달라 이름이 흔들리지 않게
  const countries = [...COMPANY_COUNTRY_CODES]
    .map((code) => ({ value: code, label: countryNameKo(code) }))
    .sort((a, b) => a.label.localeCompare(b.label, "ko"));

  return (
    <Page width="tight" gap={18}>
      <BackLink href={companyPath(company.slug)}>{C.backToCompany}</BackLink>
      <PageHead title={`${company.name} ${G.title}`} />
      <p className="text-[13.5px] text-mut">{G.lead}</p>
      <CompanyManageForm company={company} countries={countries} />
    </Page>
  );
}
