// 목록의 취향 앞세우기 — 거르지 않고 순서만 바꾼다(2026-11-16 사용자 "토글 없애고 알고리즘식으로, 필터 걸지 않고 개인화된 목록을 우선").
//
// 전에는 "내 취향" 토글이 목록을 취향 조건(플랫폼, 장르 하나)으로 **걸렀다**. 걸러진 목록은 취향 밖 게임을 아예 지워
// 둘러볼 거리가 줄었고, 토글을 끄고 켜는 일이 사람에게 넘어갔다. 지금은 조건 없이 들어온 사람의 목록에서
// 취향에 맞는 게임을 앞에 세우고 나머지는 원래 정렬 그대로 뒤에 잇는다.
//
// 점수는 둘을 더한다: 내 기기로 살 수 있나(1) + 좋아하는 장르인가(1). 둘 다 맞는 게임이 맨 앞, 하나 맞는 게임이 다음이다.
// 장르는 고른 것 전부를 "또는" 으로 본다 — 거를 때처럼 하나만 쓰면 고른 장르 다섯 중 넷이 버려진다.
// 같은 점수 안의 순서는 화면이 고른 정렬(인기순 등)이 정한다.
import { inArray, sql, type SQL } from "drizzle-orm";
import { gameGenres, gamePlatforms, games, genres, HOME_REGION, type Platform } from "@/server/db/schema";

export type ListPrefer = { platforms: readonly Platform[]; genres: readonly string[] };

/** 정렬 맨 앞에 붙일 식. 걸 것이 없으면 null — 정렬을 건드리지 않는다 */
export function preferOrder(prefer: ListPrefer | undefined): SQL | null {
  if (!prefer || (prefer.platforms.length === 0 && prefer.genres.length === 0)) return null;
  const onPlatform = prefer.platforms.length
    ? sql`(exists (select 1 from ${gamePlatforms} where ${gamePlatforms.gameId} = ${games.id} and ${gamePlatforms.region} = ${HOME_REGION}
             and ${inArray(gamePlatforms.platform, [...prefer.platforms])}))::int`
    : sql`0`;
  const onGenre = prefer.genres.length
    ? sql`(exists (select 1 from ${gameGenres} inner join ${genres} on ${genres.id} = ${gameGenres.genreId}
             where ${gameGenres.gameId} = ${games.id} and ${inArray(genres.name, [...prefer.genres])}))::int`
    : sql`0`;
  return sql`(${onPlatform} + ${onGenre}) desc`;
}

/** 캐시 열쇠 조각. 같은 취향이면 고른 순서가 달라도 같은 열쇠다 */
export function preferKey(prefer: ListPrefer | undefined): string {
  if (!prefer) return "";
  return `${[...prefer.platforms].sort().join(",")}|${[...prefer.genres].sort().join(",")}`;
}

export function parsePreferKey(key: string): ListPrefer | undefined {
  if (!key) return undefined;
  const [p = "", g = ""] = key.split("|");
  return { platforms: p ? (p.split(",") as Platform[]) : [], genres: g ? g.split(",") : [] };
}
