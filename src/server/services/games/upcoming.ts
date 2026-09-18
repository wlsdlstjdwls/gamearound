// 출시예정 목록 — "곧 나올 게임" 축.
//
// 왜 게임 단위로 세우나: 출시일은 플랫폼 행에 붙는데 PlayStation 은 그 값을 아예 주지 않는다
// (콘셉트가 COMING_SOON/null, 2026-09-16 실측). 플랫폼 행을 그대로 세우면 같은 게임이
// 스팀에서는 날짜가 있고 PS 에서는 빈칸이라 한 줄에 두 얼굴로 선다.
// 그래서 게임이 아는 **가장 이른 날짜** 하나로 묶는다 — 스토어가 서로의 빈칸을 메워 준다.
//
// 목록(/games)의 "최신 출시순" 과 다른 화면인 이유: 그쪽은 "무엇이 나왔나" 를 묻고
// 여기는 "무엇을 기다리나" 를 묻는다. 정렬 하나로 겹쳐 두면 첫 페이지가 서로를 가린다.
import { unstable_cache } from "next/cache";
import { and, asc, eq, gt, inArray, sql } from "drizzle-orm";
import { getDb } from "@/server/db/client";
import { gamePlatforms, games, HOME_REGION } from "@/server/db/schema";
import { visiblePlatformsOnly } from "@/server/db/visibility";
import { DTO_CACHE_VERSION, LIST_REVALIDATE_SECONDS } from "@/lib/cache";
import type { GameSummary } from "./dto";
import { fillGenres, groupSummaries } from "./mappers";
import { mainGamesOnly } from "./filters";

/**
 * 몇 개까지 세우나. 지금 미래 출시일을 가진 본편이 70건이라 한 화면에 다 들어간다(2026-09-18 실측).
 * 상한을 두는 것은 스토어가 "2030-12-31" 같은 자리표시 날짜를 뒤늦게 흘릴 때를 위해서다 —
 * 그런 행이 늘어도 화면은 가까운 날짜부터 채워진다.
 */
export const UPCOMING_LIMIT = 90;

/**
 * 오늘로부터 며칠까지 세나. 1년을 넘는 날짜는 스토어가 "언젠가" 를 숫자로 적어 둔 것에 가깝다
 * (2026-09-18 실측: 1년 초과 2건). 기다릴 수 있는 거리까지만 보여 준다.
 */
export const UPCOMING_WINDOW_DAYS = 365;

/** 한 게임의 출시예정 한 줄. releaseDate 는 게임이 아는 가장 이른 날짜(플랫폼 무관) */
export type UpcomingEntry = {
  game: GameSummary;
  releaseDate: string;
};

/** 같은 달에 나오는 것끼리 묶는다. key 는 "2026-10" — 라벨은 화면이 붙인다 */
export type UpcomingMonth = {
  key: string;
  items: UpcomingEntry[];
};

async function getUpcomingGamesRaw(): Promise<UpcomingMonth[]> {
  const db = getDb();
  const earliest = sql<string>`min(${gamePlatforms.releaseDate})`;

  // 1) 게임 단위로 가장 이른 미래 날짜를 뽑는다. 여기서 순서와 개수가 정해진다
  const dates = await db
    .select({ gameId: gamePlatforms.gameId, releaseDate: earliest })
    .from(gamePlatforms)
    .innerJoin(games, eq(games.id, gamePlatforms.gameId))
    .where(
      and(
        mainGamesOnly(),
        eq(gamePlatforms.region, HOME_REGION),
        visiblePlatformsOnly(),
        gt(gamePlatforms.releaseDate, sql`current_date`),
        // ::int 캐스트가 필요하다 — 자리표시자로 나가는 값은 타입이 없어서
        // Postgres 가 `date + $1` 의 연산자를 못 고른다(2026-09-18 실측: 이 화면이 통째로 500 이었다)
        sql`${gamePlatforms.releaseDate} <= current_date + ${UPCOMING_WINDOW_DAYS}::int`,
      ),
    )
    .groupBy(gamePlatforms.gameId)
    .orderBy(asc(earliest))
    .limit(UPCOMING_LIMIT);
  if (dates.length === 0) return [];

  // 2) 고른 게임의 행을 전부 읽는다. 홈과 달리 fillPlatforms 가 필요 없다 —
  //    조인 결과를 상위 N행으로 자르지 않고 게임 id 로 좁히므로 플랫폼이 잘리지 않는다
  const ids = dates.map((d) => d.gameId);
  const rows = await db
    .select({ game: games, gp: gamePlatforms })
    .from(gamePlatforms)
    .innerJoin(games, eq(games.id, gamePlatforms.gameId))
    .where(and(inArray(gamePlatforms.gameId, ids), eq(gamePlatforms.region, HOME_REGION), visiblePlatformsOnly()));

  const summaries = await fillGenres(groupSummaries(rows, ids.length));
  const bySlug = new Map(summaries.map((s) => [s.slug, s]));
  const slugByGameId = new Map(rows.map((r) => [r.game.id, r.game.slug]));

  const months = new Map<string, UpcomingEntry[]>();
  for (const { gameId, releaseDate } of dates) {
    const slug = slugByGameId.get(gameId);
    const game = slug ? bySlug.get(slug) : undefined;
    if (!game) continue;
    // 날짜는 date 컬럼이라 "YYYY-MM-DD" 로 온다. 앞 7글자가 곧 달 열쇠다 —
    // Date 로 바꿔 달을 꺼내면 UTC 로 해석돼 매월 1일이 전달로 밀린다
    const key = releaseDate.slice(0, 7);
    const list = months.get(key) ?? [];
    list.push({ game, releaseDate });
    months.set(key, list);
  }
  // Map 은 넣은 순서를 지킨다 — 1)의 날짜 오름차순이 그대로 달 순서가 된다
  return [...months].map(([key, items]) => ({ key, items }));
}

/** 출시예정 목록 — 태그 `home`. 수집이 새 출시일을 넣으면 크롤러가 무효화한다 */
export const getUpcomingGames = unstable_cache(getUpcomingGamesRaw, [DTO_CACHE_VERSION, "upcoming"], {
  tags: ["home"],
  revalidate: LIST_REVALIDATE_SECONDS,
});
