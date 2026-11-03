// /companies/[slug]/claim — 회사 페이지 관리 신청. 이미 낸 신청이 있으면 그 상태를 보여 준다.
// (user) 무리라 레이아웃이 로그인을 이미 본다(로그인 안 했으면 로그인 화면으로 돌아온다).
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CompanyClaimForm, CompanyClaimStatusCard } from "@/components/companies/claim-form";
import { Page, PageHead } from "@/components/ui/page";
import { BackLink } from "@/components/ui/back-link";
import { buttonClass } from "@/components/ui/button";
import { COMPANY_CLAIM_MESSAGES as C } from "@/lib/companies/messages";
import { companyManagePath, companyPath } from "@/lib/routes";
import { decodeSlugParam } from "@/lib/slug";
import { requireUserOrRedirect } from "@/server/auth/guards";
import { canManageCompany, findCompanyBrief, findMyCompanyClaim } from "@/server/services/company-claims";

export const metadata: Metadata = { title: C.claimTitle, robots: { index: false } };

type Props = { params: Promise<{ slug: string }> };

export default async function CompanyClaimPage({ params }: Props) {
  const slug = decodeSlugParam((await params).slug);
  const user = await requireUserOrRedirect();
  const company = await findCompanyBrief(slug);
  if (!company) notFound();
  const [mine, canManage] = await Promise.all([findMyCompanyClaim(company.id, user.id), canManageCompany(company.id, user)]);
  const showForm = !canManage && (!mine || mine.status === "rejected");

  return (
    <Page width="tight" gap={18}>
      <BackLink href={companyPath(company.slug)}>{C.backToCompany}</BackLink>
      <PageHead title={C.claimTitle} />
      <p className="text-[13.5px] leading-[1.7] text-mut">{C.claimLead(company.name)}</p>
      {canManage ? (
        <div>
          <Link href={companyManagePath(company.slug)} className={buttonClass({ size: "lg" })}>
            {C.goManage}
          </Link>
        </div>
      ) : (
        mine && <CompanyClaimStatusCard slug={company.slug} claim={mine} />
      )}
      {showForm && <CompanyClaimForm slug={company.slug} defaults={mine ?? { contactEmail: user.email }} />}
    </Page>
  );
}
