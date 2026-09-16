// 회사 조회 서비스 — 기획서 F2, F3, F4.
// route 는 이 파일로만 회사를 읽는다. Drizzle 행 타입은 밖으로 나가지 않는다.
import { unstable_cache } from "next/cache";
import { and, asc, eq, gt, isNotNull, sql } from "drizzle-orm";
import { getDb } from "@/server/db/client";
import { companies, gameCompanies, gamePlatforms, games } from "@/server/db/schema";
import { visiblePlatformsOnly } from "@/server/db/visibility";
import { DTO_CACHE_VERSION, LIST_REVALIDATE_SECONDS } from "@/lib/cache";
import type { CompanyDetail, CompanySummary, GameSummary } from "./games/dto";
import { attachBestPrice } from "./games/mappers";
import { companyDisplayName } from "./games/detail";
import { mainGamesOnly } from "./games/filters";

export const COMPANY_GAMES_PAGE_SIZE = 24;
/** 회사 목록 한 페이지. 게임 수 순으로 자르므로 꼬리의 1작품 회사는 뒤로 밀린다 */
export const COMPANIES_PAGE_SIZE = 60;

/** 이 회사에 붙은 본편 수. DLC 를 세면 "게임 120개"처럼 부풀어 보인다 */
const gameCountExpr = sql<number>`count(distinct ${games.id})::int`;

export type CompanyRoleFilter = "all" | "developer" | "publisher";

async function getCompanyBySlugRaw(slug: string): Promise<CompanyDetail | null> {
  const db = getDb();
  const company = await db.query.companies.findFirst({ where: eq(companies.slug, slug) });
  if (!company) return null;

  const [counts] = await db
    .select({
      gameCount: gameCountExpr,
      onSaleCount: sql<number>`count(distinct case when ${gamePlatforms.discountPct} > 0 then ${games.id} end)::int`,
    })
    .from(gameCompanies)
    .innerJoin(games, and(eq(games.id, gameCompanies.gameId), mainGamesOnly()))
    .leftJoin(gamePlatforms, and(eq(gamePlatforms.gameId, games.id), visiblePlatformsOnly()))
    .where(eq(gameCompanies.companyId, company.id));

  return {
    slug: company.slug,
    name: companyDisplayName(company),
    nameEn: company.nameEn,
    nameKo: company.nameKo,
    countryCode: company.countryCode,
    countryNameKo: company.countryNameKo,
    // 위키데이터의 설립일은 정밀도가 들쭉날쭉해서(연도만 아는 회사는 01-01 로 채워진다) 연도만 쓴다
    foundedYear: company.foundedAt ? Number(company.foundedAt.slice(0, 4)) : null,
    hqNameKo: company.hqNameKo,
    websiteUrl: company.websiteUrl,
    description: company.description,
    lastSyncedAt: company.lastSyncedAt?.toISOString() ?? null,
    gameCount: counts?.gameCount ?? 0,
    onSaleCount: counts?.onSaleCount ?? 0,
  };
}

/** 회사 상세 — 태그 `company:<slug>`. 그 회사 게임이 바뀌면 sync 가 이 태그를 무효화한다 */
export async function getCompanyBySlug(slug: string): Promise<CompanyDetail | null> {
  const cached = unstable_cache(() => getCompanyBySlugRaw(slug), [DTO_CACHE_VERSION, "company", slug], {
    tags: [`company:${slug}`],
    revalidate: LIST_REVALIDATE_SECONDS,
  });
  return cached();
}

export type CompanyGamesResult = {
  items: GameSummary[];
  total: number;
  page: number;
  totalPages: number;
};

async function listCompanyGamesRaw(slug: string, role: CompanyRoleFilter, page: number): Promise<CompanyGamesResult> {
  const db = getDb();
  const where = and(
    eq(companies.slug, slug),
    mainGamesOnly(),
    role === "all" ? undefined : eq(gameCompanies.role, role),
  );

  const base = db
    .select({ game: games })
    .from(gameCompanies)
    .innerJoin(companies, eq(companies.id, gameCompanies.companyId))
    .innerJoin(games, eq(games.id, gameCompanies.gameId))
    .where(where);

  const [{ total }] = await db
    .select({ total: sql<number>`count(distinct ${games.id})::int` })
    .from(gameCompanies)
    .innerJoin(companies, eq(companies.id, gameCompanies.companyId))
    .innerJoin(games, eq(games.id, gameCompanies.gameId))
    .where(where);

  const rows = await base
    // 같은 회사가 개발과 배급을 겸하면 행이 두 번 나온다. 제목순 + slug 로 고정하고 JS 에서 접는다
    .orderBy(asc(sql`coalesce(${games.titleKo}, ${games.titleEn})`), asc(games.slug))
    .limit(COMPANY_GAMES_PAGE_SIZE)
    .offset((page - 1) * COMPANY_GAMES_PAGE_SIZE);

  const unique = new Map(rows.map((r) => [r.game.id, r.game]));
  return {
    items: await attachBestPrice(Array.from(unique.values())),
    total,
    page,
    totalPages: Math.max(Math.ceil(total / COMPANY_GAMES_PAGE_SIZE), 1),
  };
}

export async function listCompanyGames(slug: string, role: CompanyRoleFilter, page: number): Promise<CompanyGamesResult> {
  const cached = unstable_cache(
    () => listCompanyGamesRaw(slug, role, page),
    [DTO_CACHE_VERSION, "company-games", slug, role, String(page)],
    { tags: [`company:${slug}`], revalidate: LIST_REVALIDATE_SECONDS },
  );
  return cached();
}

async function listCompaniesRaw(country: string | undefined, page: number): Promise<{ items: CompanySummary[]; total: number; page: number; totalPages: number }> {
  const db = getDb();
  const where = country ? eq(companies.countryCode, country) : undefined;

  const [{ total }] = await db.select({ total: sql<number>`count(*)::int` }).from(companies).where(where);

  const rows = await db
    .select({
      slug: companies.slug,
      nameEn: companies.nameEn,
      nameKo: companies.nameKo,
      countryNameKo: companies.countryNameKo,
      gameCount: gameCountExpr,
    })
    .from(companies)
    .leftJoin(gameCompanies, eq(gameCompanies.companyId, companies.id))
    .leftJoin(games, and(eq(games.id, gameCompanies.gameId), mainGamesOnly()))
    .where(where)
    .groupBy(companies.id)
    .orderBy(sql`count(distinct ${games.id}) desc`, asc(companies.nameEn))
    .limit(COMPANIES_PAGE_SIZE)
    .offset((page - 1) * COMPANIES_PAGE_SIZE);

  return {
    items: rows.map((r) => ({
      slug: r.slug,
      name: companyDisplayName(r),
      countryNameKo: r.countryNameKo,
      gameCount: r.gameCount,
    })),
    total,
    page,
    totalPages: Math.max(Math.ceil(total / COMPANIES_PAGE_SIZE), 1),
  };
}

export const listCompanies = (country: string | undefined, page: number) =>
  unstable_cache(() => listCompaniesRaw(country, page), [DTO_CACHE_VERSION, "companies", country ?? "", String(page)], {
    tags: ["home"],
    revalidate: LIST_REVALIDATE_SECONDS,
  })();

/** 국가 필터 선택지 — 실제로 회사가 붙어 있는 국가만 */
async function getCountryFacetsRaw(): Promise<Array<{ code: string; name: string; count: number }>> {
  const rows = await getDb()
    .select({
      code: companies.countryCode,
      name: companies.countryNameKo,
      count: sql<number>`count(*)::int`,
    })
    .from(companies)
    .where(and(isNotNull(companies.countryCode), isNotNull(companies.countryNameKo)))
    .groupBy(companies.countryCode, companies.countryNameKo)
    .having(gt(sql`count(*)`, 0))
    .orderBy(sql`count(*) desc`);
  return rows
    .filter((r): r is { code: string; name: string; count: number } => Boolean(r.code && r.name))
    .map((r) => ({ code: r.code, name: r.name, count: r.count }));
}

export const getCountryFacets = unstable_cache(getCountryFacetsRaw, [DTO_CACHE_VERSION, "company-countries"], {
  tags: ["home"],
  revalidate: LIST_REVALIDATE_SECONDS,
});
