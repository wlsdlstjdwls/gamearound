// 회사 상세 — 회사 정보 + 그 회사의 게임 목록(개발작, 배급작 탭).
// 회사 정보가 비어 있어도 화면이 서야 한다. 게임 목록만으로도 이 화면은 쓸모가 있기 때문에
// "정보 없음"으로 막지 않고 헤더만 줄여서 낸다.
import type { Metadata } from "next";
import { HOME_GRID_CLASS } from "@/lib/games/grid";
import { notFound } from "next/navigation";
import { GameCard } from "@/components/game-card";
import { EmptyState } from "@/components/empty-state";
import { Pagination } from "@/components/pagination";
import { ChipLink } from "@/components/ui/chip";
import { BackLink } from "@/components/ui/back-link";
import { Page, PageHead, SectionHead } from "@/components/ui/page";
import { stagger } from "@/lib/motion";
import { ROUTES, companyPath } from "@/lib/routes";
import { firstParam } from "@/lib/games-query";
import { getCompanyBySlug, listCompanyGames, type CompanyRoleFilter } from "@/server/services/companies";
import { decodeSlugParam } from "@/lib/slug";

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
  const slug = decodeSlugParam((await params).slug);
  const company = await getCompanyBySlug(slug);
  if (!company) return { title: "회사를 찾을 수 없어요" };
  const where = company.countryNameKo ? ` (${company.countryNameKo})` : "";
  return { title: `${company.name}${where}`, description: company.description ?? undefined };
}

export default async function CompanyPage({ params, searchParams }: Props) {
  const slug = decodeSlugParam((await params).slug);
  const sp = await searchParams;
  const roleRaw = firstParam(sp.role);
  const role: CompanyRoleFilter = isRole(roleRaw) ? roleRaw : "all";
  const pageNum = Math.max(Number(firstParam(sp.page)) || 1, 1);

  // 목록도 slug 로 조회한다 — 회사 행이 오기를 기다릴 이유가 없다(왕복 한 번이 200ms 대)
  const [company, result] = await Promise.all([getCompanyBySlug(slug), listCompanyGames(slug, role, pageNum)]);
  if (!company) notFound();

  return (
    <Page pad="detail" gap={40}>
      {/* 머리 — 왼쪽은 이름과 정체, 오른쪽은 숫자 셋. 숫자를 제목과 같은 줄에 세우는 이유는
          "이 회사가 무엇을 얼마나 만들었나" 가 한 눈에 끝나야 해서다(2026-09-21 리디자인) */}
      <header className="enter-item flex flex-col gap-4" style={stagger(0)}>
        <BackLink href={ROUTES.company}>회사 목록으로</BackLink>
        <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
          <div className="min-w-0">
            <PageHead size="hero" title={company.name} />
            <p className="mt-2 text-[13.5px] text-mut">
              {[
                company.nameKo && company.nameEn !== company.nameKo ? company.nameEn : null,
                company.countryNameKo,
                company.foundedYear ? `${company.foundedYear}년 설립` : null,
                company.hqNameKo,
              ]
                .filter(Boolean)
                .join(" | ")}
            </p>
          </div>

          <dl className="grid grid-cols-2 gap-x-7 gap-y-5 sm:grid-cols-3">
            <div>
              <dt className="text-[12px] text-dim">등록된 게임</dt>
              <dd className="mt-1 text-[22px] font-extrabold tracking-[-0.04em] text-ink sm:text-[26px]">{company.gameCount}개</dd>
            </div>
            {company.onSaleCount > 0 && (
              <div>
                <dt className="text-[12px] text-dim">지금 할인 중</dt>
                <dd className="mt-1 text-[22px] font-extrabold tracking-[-0.04em] text-acc sm:text-[26px]">{company.onSaleCount}개</dd>
              </div>
            )}
            {company.websiteUrl && (
              <div>
                <dt className="text-[12px] text-dim">공식 사이트</dt>
                <dd className="mt-1">
                  <a
                    href={company.websiteUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[14px] font-semibold text-acc underline-offset-2 hover:underline"
                  >
                    바로 가기
                    <span className="sr-only">(새 창에서 열림)</span>
                  </a>
                </dd>
              </div>
            )}
          </dl>
        </div>

        {company.description && (
          <p className="max-w-[620px] border-t border-line pt-4 text-[13.5px] leading-[1.8] text-mut">{company.description}</p>
        )}
      </header>

      <section className="flex flex-col gap-[18px]">
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
          <ul className={HOME_GRID_CLASS}>
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
