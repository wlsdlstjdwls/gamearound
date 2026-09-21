// 회사 목록 — 국가 칩으로 좁히고 게임 수 순으로 본다.
// 헤더 메뉴에 올리지 않는 이유: 회사 데이터가 충분히 쌓이기 전까지는 게임 상세의 회사 칩이 유일한 진입점이어야
// 빈 목록을 사용자에게 먼저 보여주지 않는다.
import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState } from "@/components/empty-state";
import { Pagination } from "@/components/pagination";
import { ChipLink } from "@/components/ui/chip";
import { Page, PageHead, ROW, ROWS } from "@/components/ui/page";
import { cn } from "@/lib/cn";
import { Clamp } from "@/components/ui/tooltip";
import { stagger } from "@/lib/motion";
import { ROUTES, companyPath } from "@/lib/routes";
import { firstParam } from "@/lib/games-query";
import { getCountryFacets, listCompanies } from "@/server/services/companies";

// Next 가 정적으로 읽는 값이라 리터럴이어야 한다 — lib/cache 의 LIST_REVALIDATE_SECONDS 와 같게 유지
export const revalidate = 3600;

export const metadata: Metadata = { title: "게임 회사" };

type Search = Record<string, string | string[] | undefined>;
type Props = { searchParams: Promise<Search> };

/** 현재 필터에서 일부만 바꾼 /companies URL. 기본값은 빼서 같은 화면이 같은 주소가 되게 한다 */
function companiesHref(country: string | undefined, page: number): string {
  const params = new URLSearchParams();
  if (country) params.set("country", country);
  if (page > 1) params.set("page", String(page));
  const qs = params.toString();
  return qs ? `${ROUTES.company}?${qs}` : ROUTES.company;
}

export default async function CompaniesPage({ searchParams }: Props) {
  const sp = await searchParams;
  const country = firstParam(sp.country);
  const pageNum = Math.max(Number(firstParam(sp.page)) || 1, 1);

  const [countries, result] = await Promise.all([getCountryFacets(), listCompanies(country, pageNum)]);

  return (
    <Page gap={26}>
      <PageHead title="게임 회사" note={result.total > 0 ? `${result.total}곳` : undefined} />

      {/* 국가 칩은 판이 아니라 헤어라인 띠 안에 선다 — 목록의 "걸린 조건" 띠와 같은 규칙이다 */}
      {countries.length > 0 && (
        <section aria-label="국가 필터" className="flex flex-wrap gap-1.5 border-y border-line py-3">
          <ChipLink href={companiesHref(undefined, 1)} active={!country}>
            전체
          </ChipLink>
          {countries.map((c) => (
            <ChipLink key={c.code} href={companiesHref(c.code, 1)} active={country === c.code}>
              {c.name} <span className="opacity-55">{c.count}</span>
            </ChipLink>
          ))}
        </section>
      )}

      {result.items.length === 0 ? (
        <EmptyState
          title="아직 회사 정보를 모으는 중이에요"
          description="개발사, 배급사 정보를 하나씩 확인하고 있어요."
          action={{ href: ROUTES.game, label: "게임 목록 보기" }}
        />
      ) : (
        // 셋씩 세우던 카드를 줄로 바꿨다 — 회사 카드에는 커버가 없어 판을 걷어내면 남는 게 글자 두 줄이고,
        // 그 두 줄을 격자에 흩어 두면 훑을 때 눈이 좌우로 튄다
        <ul className={cn(ROWS, "sm:grid sm:grid-cols-2 sm:gap-x-10 lg:grid-cols-3")}>
          {result.items.map((c, i) => (
            <li key={c.slug} className="enter-item" style={stagger(i)}>
              <Link href={companyPath(c.slug)} className={cn(ROW, "flex items-baseline justify-between gap-3 py-[13px]")}>
                <Clamp lines={1} className="min-w-0 text-[14.5px] font-bold tracking-[-0.02em] text-ink">
                  {c.name}
                </Clamp>
                <span className="shrink-0 text-[12px] text-dim">
                  {c.countryNameKo ? `${c.countryNameKo} | ` : ""}
                  {c.gameCount}개
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {result.totalPages > 1 && (
        <Pagination page={result.page} totalPages={result.totalPages} hrefFor={(p) => companiesHref(country, p)} />
      )}
    </Page>
  );
}
