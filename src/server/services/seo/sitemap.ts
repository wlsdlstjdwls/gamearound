// sitemap 에 실을 공개 주소 — 게임 상세, 회사, 인디 글.
//
// 화면이 내주는 것과 같은 조건으로 고른다. 게임은 목록이 쓰는 mainGamesOnly(본편, 공개, 커버, 스토어 매칭)를 그대로 쓴다 —
// 목록에 안 서는 게임을 검색엔진에 알리면 들어온 사람이 빈 화면(값 없는 카드, 커버 없는 판)을 먼저 본다.
// DLC, 에디션 화면은 싣지 않는다: 본편 상세가 그 목록을 링크로 내주므로 검색엔진은 거기서 따라간다.
// 회사는 본편이 하나라도 서는 곳만 싣는다 — 게임 0개 회사 화면은 얇은 페이지로 읽힌다.
import { desc, sql } from "drizzle-orm";
import { getDb } from "@/server/db/client";
import { companies, gameCompanies, games } from "@/server/db/schema";
import { indiePosts } from "@/server/db/schema-indie";
import { isPublic as indieIsPublic } from "@/server/services/indie/read";
import { mainGamesOnly } from "@/server/services/games/filters";
import { SITEMAP_GAMES_PER_FILE } from "@/lib/seo/constants";

export type SitemapEntryDto = { slug: string; updatedAt: Date };

export async function listSitemapGames(offset: number, limit: number): Promise<SitemapEntryDto[]> {
  return getDb()
    .select({ slug: games.slug, updatedAt: games.updatedAt })
    .from(games)
    .where(mainGamesOnly())
    // 쪼갠 파일끼리 겹치거나 빠지지 않게 바뀌지 않는 열(slug, unique)로 줄 세운다
    .orderBy(games.slug)
    .offset(offset)
    .limit(limit);
}

export async function countSitemapGames(): Promise<number> {
  const [row] = await getDb().select({ n: sql<number>`count(*)::int` }).from(games).where(mainGamesOnly());
  return row?.n ?? 0;
}

/** 게임 sitemap 파일 수. app/sitemap 이 파일을 나누고 app/robots 가 Sitemap 줄을 세우는 값이 같아야 한다 */
export async function sitemapGameFileCount(): Promise<number> {
  return Math.max(1, Math.ceil((await countSitemapGames()) / SITEMAP_GAMES_PER_FILE));
}

export async function listSitemapCompanies(): Promise<SitemapEntryDto[]> {
  return getDb()
    .select({ slug: companies.slug, updatedAt: companies.updatedAt })
    .from(companies)
    .where(
      sql`exists (
        select 1 from ${gameCompanies} inner join ${games} on ${games.id} = ${gameCompanies.gameId}
        where ${gameCompanies.companyId} = ${companies.id} and ${mainGamesOnly()}
      )`,
    )
    .orderBy(companies.slug);
}

export async function listSitemapIndie(): Promise<SitemapEntryDto[]> {
  return getDb()
    .select({ slug: indiePosts.slug, updatedAt: indiePosts.updatedAt })
    .from(indiePosts)
    // 공개 목록과 같은 조건(게시 + 승인 + 커버) — 심사 중인 글을 먼저 색인시키지 않는다
    .where(indieIsPublic)
    .orderBy(desc(indiePosts.updatedAt));
}
