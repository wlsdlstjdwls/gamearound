// 헤더 검색창 자동완성(기획서 v2.0 4.3 "입력 중 자동완성 목록, 선택하면 게임 상세로").
// 게임명(한글, 영문, 별칭), 장르, 개발사 세 갈래를 한 번에 돌려준다. 검색 결과 화면(search.ts)과 같은 제목 규칙(title-search)을 쓴다 —
// 자동완성에 뜬 게임이 엔터를 친 결과 화면에서 빠지면 두 화면이 다른 말을 한다.
//
// 세 질의를 나란히 보낸다. 줄 세우면 Neon 왕복이 셋이 되고(1회 약 220ms), 자동완성은 손가락보다 늦으면 쓸모가 없다.
// 결과는 검색어별로 캐시한다 — 같은 앞글자("엘든")를 여러 사람이 친다.
import { unstable_cache } from "next/cache";
import { and, asc, desc, eq, ilike, or, sql } from "drizzle-orm";
import { getDb } from "@/server/db/client";
import { companies, gameCompanies, gameGenres, games, genres } from "@/server/db/schema";
import { DTO_CACHE_VERSION, LIST_REVALIDATE_SECONDS } from "@/lib/cache";
import { SUGGEST_LIMITS, SUGGEST_MIN_CHARS } from "@/lib/search/suggest";
import { normalizeForSearch } from "@/lib/slug";
import { mainGamesOnly } from "./filters";
import { isMissingTrgm, titleMatch, titleMatches } from "./title-search";

export type SuggestGame = { slug: string; title: string; subtitle: string | null; coverUrl: string | null };
export type SuggestGenre = { name: string; count: number };
export type SuggestCompany = { slug: string; name: string };
export type SuggestResult = { games: SuggestGame[]; genres: SuggestGenre[]; companies: SuggestCompany[] };

const EMPTY: SuggestResult = { games: [], genres: [], companies: [] };

function likePattern(q: string): string {
  return `%${q.replace(/[\\%_]/g, (m) => `\\${m}`)}%`;
}

async function suggestGames(q: string): Promise<SuggestGame[]> {
  const db = getDb();
  const { hit, score } = titleMatch(q);
  const cols = { slug: games.slug, titleKo: games.titleKo, titleEn: games.titleEn, coverUrl: games.coverUrl };
  let rows: Array<{ slug: string; titleKo: string | null; titleEn: string; coverUrl: string | null }>;
  try {
    rows = await db
      .select(cols)
      .from(games)
      .where(and(mainGamesOnly(), titleMatches({ hit, score })))
      .orderBy(sql`${hit} desc`, sql`${score} desc`, games.titleEn)
      .limit(SUGGEST_LIMITS.games);
  } catch (err) {
    if (!isMissingTrgm(err)) throw err;
    rows = await db.select(cols).from(games).where(and(mainGamesOnly(), hit)).orderBy(games.titleEn).limit(SUGGEST_LIMITS.games);
  }
  // 한글 제목이 있으면 그것을 크게, 영문을 작게 — 둘이 같으면 아래 줄을 비운다
  return rows.map((r) => ({
    slug: r.slug,
    title: r.titleKo ?? r.titleEn,
    subtitle: r.titleKo && r.titleKo !== r.titleEn ? r.titleEn : null,
    coverUrl: r.coverUrl,
  }));
}

async function suggestGenres(q: string): Promise<SuggestGenre[]> {
  const db = getDb();
  return db
    .select({ name: genres.name, count: sql<number>`count(${gameGenres.gameId})::int` })
    .from(genres)
    .leftJoin(gameGenres, eq(gameGenres.genreId, genres.id))
    .where(ilike(genres.name, likePattern(q)))
    .groupBy(genres.id, genres.name)
    // 게임이 많이 붙은 장르가 먼저다 — "액" 에 "액션" 이 "액션 어드벤처 퍼즐" 보다 먼저 와야 한다
    .orderBy(desc(sql`count(${gameGenres.gameId})`), asc(genres.name))
    .limit(SUGGEST_LIMITS.genres);
}

async function suggestCompanies(q: string): Promise<SuggestCompany[]> {
  const db = getDb();
  const pattern = likePattern(q);
  const rows = await db
    .select({ slug: companies.slug, nameKo: companies.nameKo, nameEn: companies.nameEn, n: sql<number>`count(${gameCompanies.gameId})::int` })
    .from(companies)
    .leftJoin(gameCompanies, eq(gameCompanies.companyId, companies.id))
    .where(or(ilike(companies.nameEn, pattern), ilike(companies.nameKo, pattern)))
    .groupBy(companies.id)
    .orderBy(desc(sql`count(${gameCompanies.gameId})`), asc(companies.nameEn))
    .limit(SUGGEST_LIMITS.companies);
  return rows.map((r) => ({ slug: r.slug, name: r.nameKo ?? r.nameEn }));
}

async function suggestRaw(q: string): Promise<SuggestResult> {
  const [g, ge, c] = await Promise.all([suggestGames(q), suggestGenres(q), suggestCompanies(q)]);
  return { games: g, genres: ge, companies: c };
}

/** 검색어가 너무 짧으면 묻지 않는다 — 한 글자는 거의 모든 행에 걸려 목록이 아무 말도 안 한다 */
export async function suggest(raw: string): Promise<SuggestResult> {
  const q = raw.trim();
  if (normalizeForSearch(q).length < SUGGEST_MIN_CHARS) return EMPTY;
  const key = q.toLowerCase();
  return unstable_cache(() => suggestRaw(key), [DTO_CACHE_VERSION, "suggest", key], { tags: ["home"], revalidate: LIST_REVALIDATE_SECONDS })();
}
