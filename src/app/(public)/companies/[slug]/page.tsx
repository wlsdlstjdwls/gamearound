// 회사 상세 — 회사 정보 + 그 회사의 게임 목록(개발작, 배급작 탭).
// 회사 정보가 비어 있어도 화면이 서야 한다. 게임 목록만으로도 이 화면은 쓸모가 있기 때문에
// "정보 없음"으로 막지 않고 헤더만 줄여서 낸다.
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { GameCard } from "@/components/game-card";
import { EmptyState } from "@/components/empty-state";
import { Pagination } from "@/components/pagination";
import { ChipLink } from "@/components/ui/chip";
import { Card, Page, SectionHead } from "@/components/ui/page";
import { stagger } from "@/lib/motion";
import { ROUTES, companyPath } from "@/lib/routes";
import { firstParam } from "@/lib/games-query";
import { getCompanyBySlug, listCompanyGames, type CompanyRoleFilter } from "@/server/services/companies";

// Next 가 정적으로 읽는 값이라 리터럴이어야 한다 — lib/cache 의 LIST_REVALIDATE_SECONDS 와 같게 유지
export const revalidate = 3600;

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const ROLE_TABS: Array<{ key: CompanyRoleFilter; label: string }> = [
  { key: "all", label: "전체" },
  { key: "developer", label: "개발작" },
  { key: "publisher", label: "배급작" },
];

function isRole(v: string | undefined): v is CompanyRoleFilter {
  return v === "all" || v === "developer" || v === "publisher";
}

function href(slug: string, role: CompanyRoleFilter, page: number): string {
  const params = new URLSearchParams();
  if (role !== "all") params.set("role", role);
  if (page > 1) params.set("page", String(page));
  const qs = params.toString();
  return qs ? `${companyPath(slug)}?${qs}` : companyPath(slug);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const company = await getCompanyBySlug(slug);
  if (!company) return { title: "회사를 찾을 수 없어요" };
  const where = company.countryNameKo ? ` (${company.countryNameKo})` : "";
  return { title: `${company.name}${where}`, description: company.description ?? undefined };
}

/** 정보 행 하나. 값이 없으면 행 자체를 그리지 않는다 — 빈 칸이 줄지어 있으면 고장처럼 보인다 */
function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-[11.5px] text-dim">{label}</dt>
      <dd className="text-[13.5px] text-ink">{children}</dd>
    </div>
  );
}

export default async function CompanyPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const sp = await searchParams;
  const roleRaw = firstParam(sp.role);
  const role: CompanyRoleFilter = isRole(roleRaw) ? roleRaw : "all";
  const pageNum = Math.max(Number(firstParam(sp.page)) || 1, 1);

  const company = await getCompanyBySlug(slug);
  if (!company) notFound();
  const result = await listCompanyGames(slug, role, pageNum);

  const hasFacts = Boolean(company.countryNameKo || company.foundedYear || company.hqNameKo || company.websiteUrl);

  return (
    <Page pad="detail" gap={24}>
      <header className="enter-item flex flex-col gap-3" style={stagger(0)}>
        <Link href={ROUTES.company} className="self-start text-[12.5px] text-dim transition-colors hover:text-ink">
          회사 목록으로
        </Link>
        <h1 className="text-[26px] font-bold leading-[1.25] tracking-[-0.03em] text-ink">{company.name}</h1>
        {company.nameKo && company.nameEn !== company.nameKo && (
          <p className="text-[13px] text-dim">{company.nameEn}</p>
        )}
        <p className="text-[13px] text-mut">
          게임 {company.gameCount}개
          {company.onSaleCount > 0 && (
            <>
              {" | "}
              <span className="font-semibold text-acc">지금 할인 중 {company.onSaleCount}개</span>
            </>
          )}
        </p>
      </header>

      {hasFacts && (
        <Card className="enter-item px-5 py-4" style={stagger(1)}>
          <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {company.countryNameKo && <Fact label="국가">{company.countryNameKo}</Fact>}
            {company.foundedYear && <Fact label="설립">{company.foundedYear}년</Fact>}
            {company.hqNameKo && <Fact label="본사">{company.hqNameKo}</Fact>}
            {company.websiteUrl && (
              <Fact label="공식 사이트">
                <a
                  href={company.websiteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-acc underline-offset-2 hover:underline"
                >
                  바로 가기
                  <span className="sr-only">(새 창에서 열림)</span>
                </a>
              </Fact>
            )}
          </dl>
          {company.description && (
            <p className="mt-4 border-t border-line-soft pt-3 text-[13px] leading-[1.7] text-mut">{company.description}</p>
          )}
        </Card>
      )}

      <section className="flex flex-col gap-3">
        <SectionHead
          title="이 회사의 게임"
          note={result.total > 0 ? `${result.total}개` : undefined}
          className="enter-item"
          style={stagger(2)}
          action={
            <div className="flex gap-1.5">
              {ROLE_TABS.map((t) => (
                <ChipLink key={t.key} href={href(slug, t.key, 1)} active={role === t.key} size="sm">
                  {t.label}
                </ChipLink>
              ))}
            </div>
          }
        />

        {result.items.length === 0 ? (
          <EmptyState
            title="여기에 보여줄 게임이 아직 없어요"
            description="다른 탭을 눌러보거나, 전체 게임 목록에서 찾아보세요."
            action={{ href: ROUTES.game, label: "게임 목록 보기" }}
          />
        ) : (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {result.items.map((g, i) => (
              <li key={g.slug} className="enter-item" style={stagger(i + 3)}>
                <GameCard game={g} />
              </li>
            ))}
          </ul>
        )}
      </section>

      {result.totalPages > 1 && (
        <Pagination page={result.page} totalPages={result.totalPages} hrefFor={(p) => href(slug, role, p)} />
      )}
    </Page>
  );
}
