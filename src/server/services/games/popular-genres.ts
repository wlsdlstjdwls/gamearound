// 목록의 "요즘 많이 찾는 장르" — 최근 7일 상세 조회 횟수(server/game-views)를 장르별로 더한 순서.
// 2026-10-28 사용자 결정 "실제 조회 수 기준으로". 그전에는 장르별 게임 수 상위 넷이라 이름과 기준이 달랐다.
//
// 캐시는 한 시간이다. 칩 순서는 분 단위로 바뀔 이유가 없고, 목록 요청마다 Redis 와 Neon 을 한 번씩 더 오가면
// 필터 막대가 그만큼 늦게 선다(neon-roundtrip-cost). 장르 이름만 돌려주므로 DTO 판(DTO_CACHE_VERSION)과 무관하다.
import { unstable_cache } from "next/cache";
import { eq, inArray } from "drizzle-orm";
import { getDb } from "@/server/db/client";
import { gameGenres, games, genres } from "@/server/db/schema";
import { viewCountsBySlug } from "@/server/game-views";
import { rankGenresByViews } from "@/lib/games/popular-genres";

/** 칩 순서 캐시 수명(초). 위 머리말의 이유 */
const POPULAR_GENRES_REVALIDATE_SECONDS = 3600;

async function getViewedSlugGenres(): Promise<{ counts: [string, number][]; rows: { slug: string; genre: string }[] }> {
  const counts = await viewCountsBySlug();
  if (counts.size === 0) return { counts: [], rows: [] };
  const rows = await getDb()
    .select({ slug: games.slug, genre: genres.name })
    .from(gameGenres)
    .innerJoin(games, eq(games.id, gameGenres.gameId))
    .innerJoin(genres, eq(genres.id, gameGenres.genreId))
    .where(inArray(games.slug, [...counts.keys()]));
  return { counts: [...counts], rows };
}

// Map 은 캐시에 직렬화되지 않아 배열로 담는다
const getViewedSlugGenresCached = unstable_cache(getViewedSlugGenres, ["popular-genres"], { revalidate: POPULAR_GENRES_REVALIDATE_SECONDS });

/**
 * fallback 은 그 목록 범위의 장르를 게임 수 순서로 담은 것(getGameFacets). 조회가 모자라면 그 순서로 채운다.
 * 조회를 못 읽어도 던지지 않는다 — 칩은 덤이라 게임 수 순서로 물러난다.
 */
export async function getPopularGenres(fallback: readonly string[], limit: number): Promise<string[]> {
  try {
    const { counts, rows } = await getViewedSlugGenresCached();
    return rankGenresByViews(rows, new Map(counts), fallback, limit);
  } catch (e) {
    console.warn(`[popular-genres] 조회 순위 실패 — 게임 수 순서: ${String(e)}`);
    return fallback.slice(0, limit);
  }
}
