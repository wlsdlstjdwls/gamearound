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
import { and, eq, gt, inArray, sql } from "drizzle-orm";
import { getDb } from "@/server/db/client";
import { gamePlatforms, games, HOME_REGION } from "@/server/db/schema";
import { visiblePlatformsOnly } from "@/server/db/visibility";
import { DTO_CACHE_VERSION, LIST_REVALIDATE_SECONDS } from "@/lib/cache";
import { POPULARITY_RANK_MAX_AGE_DAYS } from "@/lib/games/popularity";
import type { GameSummary } from "./dto";
import { fillGenres, groupSummaries } from "./mappers";
import { mainGamesOnly } from "./filters";

/**
 * 한 번에 그리는 카드 수. 넓은 화면 격자 네 줄이다 — 그 아래는 "더 보기"(이어 붙이기)로 같은 달을 계속 읽는다.
 *
 * 2026-10-07 전에는 이 수가 **달마다의 상한**이었다(UPCOMING_MONTH_LIMIT). 모든 달을 한 화면에 세우려니 달마다
 * 잘라야 했고, 10월 233개 중 24개만 보이고 나머지는 볼 길이 없었다(사용자 지적: "한 화면에 모든 달의 게임을
 * 뿌리는게 문제"). 지금은 한 화면에 **고른 달 하나**만 세우고 그 달은 끝까지 읽힌다.
 */
export const UPCOMING_PAGE_SIZE = 24;

/**
 * 오늘로부터 며칠까지 세나. 1년을 넘는 날짜는 스토어가 "언젠가" 를 숫자로 적어 둔 것에 가깝다
 * (2026-09-18 실측: 1년 초과 2건). 기다릴 수 있는 거리까지만 보여 준다.
 */
export const UPCOMING_WINDOW_DAYS = 365;

/**
 * "이달의 기대작" 몫(2026-10-07, 사용자: "그 달에 GTA 같은 인기 유망주가 상단에 나오면").
 * 날짜순만으로는 10월 465개 사이에 Phantom Blade Zero 가 29일 자리에 묻혔다.
 *
 * 근거는 스토어 인기 순번 하나다 — 출시 전 게임은 평가 수도 HLTB 기록도 없어(10월 465개 중 9, 4건)
 * 목록 인기순의 둘째, 셋째 키가 여기서는 안 선다. 순번은 PS 예약 순위가 채워 준다(GTA VI 1위).
 * 넷은 넓은 화면 격자 한 줄이다. 300위 컷은 실측으로 잡았다: 그 안은 이름 있는 기대작이고
 * 400위 밖부터 "Police Car Simulator" 류가 섞인다. 컷을 넘는 게임이 없는 달은 이 줄을 아예 세우지 않는다.
 */
export const UPCOMING_PICK_LIMIT = 4;
export const UPCOMING_PICK_RANK_MAX = 300;

/** 한 게임의 출시예정 한 줄. releaseDate 는 게임이 아는 가장 이른 날짜(플랫폼 무관) */
export type UpcomingEntry = {
  game: GameSummary;
  releaseDate: string;
};

/** 달 탭 한 칸. key 는 "2026-10" — 라벨은 화면이 붙인다 */
export type UpcomingMonthTab = { key: string; total: number };

/** 한 달의 한 장 */
export type UpcomingPage = { items: UpcomingEntry[]; hasMore: boolean };

/** 달 열쇠 모양. 주소(?month=)로 들어오는 값이라 질의에 넣기 전에 본다 */
export const UPCOMING_MONTH_KEY = /^\d{4}-\d{2}$/;

/**
 * 게임마다 가장 이른 미래 출시일. 달 탭과 한 달 목록이 같은 기준을 써야 탭의 건수와 목록 끝이 맞는다.
 *
 * 생 SQL 조각인 이유: min() 묶음을 CTE 로 다시 거르는 모양이 빌더로는 읽기 어렵다.
 * 조건 조각(mainGamesOnly, visiblePlatformsOnly)은 그대로 끼워 넣어 다른 화면과 같은 기준을 쓴다 —
 * 여기서 손으로 다시 적으면 숨김 규칙이 갈린다.
 */
function earliestCte() {
  const visible = visiblePlatformsOnly();
  return sql`
    with earliest as (
      select ${gamePlatforms.gameId} as game_id, min(${gamePlatforms.releaseDate}) as release_date,
        -- 낡은 순번은 버린다 — 목록 인기순과 같은 규칙(services/games/list 의 minRank 주석)
        min(${gamePlatforms.popularityRank}) filter (
          where ${gamePlatforms.popularityRankAt} >= now() - make_interval(days => ${POPULARITY_RANK_MAX_AGE_DAYS}::int)
        ) as rank
      from ${gamePlatforms}
      inner join ${games} on ${games.id} = ${gamePlatforms.gameId}
      where ${mainGamesOnly()}
        and ${eq(gamePlatforms.region, HOME_REGION)}
        ${visible ? sql`and ${visible}` : sql``}
        and ${gt(gamePlatforms.releaseDate, sql`current_date`)}
        -- ::int 캐스트가 필요하다 — 자리표시자로 나가는 값은 타입이 없어서
        -- Postgres 가 date + $1 의 연산자를 못 고른다(2026-09-18 실측: 이 화면이 통째로 500 이었다)
        and ${gamePlatforms.releaseDate} <= current_date + ${UPCOMING_WINDOW_DAYS}::int
      group by ${gamePlatforms.gameId}
    )`;
}

async function getUpcomingMonthsRaw(): Promise<UpcomingMonthTab[]> {
  // date 컬럼이라 "YYYY-MM-DD" 로 온다. 앞 7글자가 곧 달 열쇠다 —
  // Date 로 바꿔 달을 꺼내면 UTC 로 해석돼 매월 1일이 전달로 밀린다
  const res = await getDb().execute<{ key: string; total: number }>(sql`
    ${earliestCte()}
    select substr(release_date::text, 1, 7) as key, count(*)::int as total
    from earliest group by 1 order by 1
  `);
  return res.rows.map((r) => ({ key: r.key, total: Number(r.total) }));
}

/**
 * 한 달의 기대작 id 를 고르는 조각. 기대작 줄과 날짜순 목록이 **같은 조각**을 써야 한다 —
 * 날짜순은 이 몫을 빼고 세므로, 두 곳의 고르는 규칙이 갈리면 한 게임이 두 번 서거나 아무 데도 안 선다.
 * earliestCte() 다음에 붙는다(그 CTE 를 읽는다).
 */
function picksCte(key: string) {
  return sql`, picks as (
      select game_id from earliest
      where substr(release_date::text, 1, 7) = ${key} and rank <= ${UPCOMING_PICK_RANK_MAX}::int
      order by rank asc, game_id asc
      limit ${UPCOMING_PICK_LIMIT}::int
    )`;
}

async function getUpcomingMonthPicksRaw(key: string): Promise<UpcomingEntry[]> {
  if (!UPCOMING_MONTH_KEY.test(key)) return [];
  const res = await getDb().execute<{ game_id: string; release_date: string }>(sql`
    ${earliestCte()}${picksCte(key)}
    select e.game_id, e.release_date::text as release_date
    from earliest e inner join picks p on p.game_id = e.game_id
    order by e.rank asc, e.game_id asc
  `);
  return toEntries(res.rows);
}

async function getUpcomingMonthPageRaw(key: string, page: number): Promise<UpcomingPage> {
  if (!UPCOMING_MONTH_KEY.test(key)) return { items: [], hasMore: false };
  const offset = (Math.max(1, page) - 1) * UPCOMING_PAGE_SIZE;
  // 한 장보다 하나 더 받아 "다음 장이 있나" 를 센다 — count 질의를 따로 보내면 왕복이 하나 는다
  const ranked = await getDb().execute<{ game_id: string; release_date: string }>(sql`
    ${earliestCte()}${picksCte(key)}
    select game_id, release_date::text as release_date
    from earliest
    where substr(release_date::text, 1, 7) = ${key}
      and game_id not in (select game_id from picks)
    order by release_date asc, game_id asc
    limit ${UPCOMING_PAGE_SIZE + 1}::int offset ${offset}::int
  `);
  const hasMore = ranked.rows.length > UPCOMING_PAGE_SIZE;
  return { items: await toEntries(ranked.rows.slice(0, UPCOMING_PAGE_SIZE)), hasMore };
}

/** 고른 (게임, 날짜) 순서 그대로 카드 DTO 를 채운다 */
async function toEntries(dates: { game_id: string; release_date: string }[]): Promise<UpcomingEntry[]> {
  if (dates.length === 0) return [];
  const db = getDb();

  // 고른 게임의 행을 전부 읽는다. 홈과 달리 fillPlatforms 가 필요 없다 —
  // 조인 결과를 상위 N행으로 자르지 않고 게임 id 로 좁히므로 플랫폼이 잘리지 않는다
  const ids = dates.map((d) => d.game_id);
  const rows = await db
    .select({ game: games, gp: gamePlatforms })
    .from(gamePlatforms)
    .innerJoin(games, eq(games.id, gamePlatforms.gameId))
    .where(and(inArray(gamePlatforms.gameId, ids), eq(gamePlatforms.region, HOME_REGION), visiblePlatformsOnly()));

  const summaries = await fillGenres(groupSummaries(rows, ids.length));
  const bySlug = new Map(summaries.map((s) => [s.slug, s]));
  const slugByGameId = new Map(rows.map((r) => [r.game.id, r.game.slug]));
  const items: UpcomingEntry[] = [];
  for (const { game_id, release_date } of dates) {
    const slug = slugByGameId.get(game_id);
    const game = slug ? bySlug.get(slug) : undefined;
    if (game) items.push({ game, releaseDate: release_date });
  }
  return items;
}

/** 출시예정 달 탭 — 태그 `home`. 수집이 새 출시일을 넣으면 크롤러가 무효화한다 */
export const getUpcomingMonths = unstable_cache(getUpcomingMonthsRaw, [DTO_CACHE_VERSION, "upcoming-months"], {
  tags: ["home"],
  revalidate: LIST_REVALIDATE_SECONDS,
});

/** 한 달의 기대작 줄. 날짜순 목록과 같은 태그, 같은 수명이라 둘이 엇갈려 낡지 않는다 */
export const getUpcomingMonthPicks = unstable_cache(getUpcomingMonthPicksRaw, [DTO_CACHE_VERSION, "upcoming-month-picks"], {
  tags: ["home"],
  revalidate: LIST_REVALIDATE_SECONDS,
});

/** 한 달의 한 장(기대작 몫은 빼고). 달과 장 번호가 캐시 열쇠에 들어간다(unstable_cache 는 인자를 열쇠에 더한다) */
export const getUpcomingMonthPage = unstable_cache(getUpcomingMonthPageRaw, [DTO_CACHE_VERSION, "upcoming-month-page"], {
  tags: ["home"],
  revalidate: LIST_REVALIDATE_SECONDS,
});
