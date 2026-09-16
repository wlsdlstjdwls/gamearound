// 게임 검색 — 정규화 제목 부분일치 + trigram 유사도(오타 허용).
import { unstable_cache } from "next/cache";
import { and, sql } from "drizzle-orm";
import { getDb } from "@/server/db/client";
import { games } from "@/server/db/schema";
import type { GameSummary } from "./dto";
import { attachBestPrice, type GameRow } from "./mappers";
import { isMissingTrgm, titleMatch, titleMatches } from "./title-search";
import { mainGamesOnly } from "./filters";
import { DTO_CACHE_VERSION, LIST_REVALIDATE_SECONDS } from "@/lib/cache";

const SEARCH_DEFAULT_LIMIT = 24;

async function searchGamesRaw(q: string, limit: number): Promise<GameSummary[]> {
  const db = getDb();
  const { norm, hit, score } = titleMatch(q);
  if (!norm) return [];

  let rows: GameRow[];
  try {
    rows = await db
      .select()
      .from(games)
      .where(and(mainGamesOnly(), titleMatches({ hit, score })))
      .orderBy(sql`${hit} desc`, sql`${score} desc`, games.titleEn)
      .limit(limit);
  } catch (err) {
    if (!isMissingTrgm(err)) throw err;
    rows = await db.select().from(games).where(and(mainGamesOnly(), hit)).orderBy(games.titleEn).limit(limit);
  }
  return attachBestPrice(rows);
}

/** 검색 — 검색어별 1시간 캐시 (§4.5 풀 라우트 캐시 보조) */
export async function searchGames(q: string, opts: { limit?: number } = {}): Promise<GameSummary[]> {
  const limit = Math.min(Math.max(opts.limit ?? SEARCH_DEFAULT_LIMIT, 1), 50);
  const key = q.trim().toLowerCase();
  if (!key) return [];
  const cached = unstable_cache(() => searchGamesRaw(key, limit), [DTO_CACHE_VERSION, "search", key, String(limit)], {
    tags: ["home"],
    revalidate: LIST_REVALIDATE_SECONDS,
  });
  return cached();
}
