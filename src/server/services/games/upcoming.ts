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
import type { GameSummary } from "./dto";
import { fillGenres, groupSummaries } from "./mappers";
import { mainGamesOnly } from "./filters";

/**
 * 몇 개까지 세우나. **달마다** 이만큼씩이다(2026-09-22).
 *
 * 전에는 전체 90개를 날짜 오름차순으로 잘랐다(UPCOMING_LIMIT). 그 방식이 이 화면을 한 달짜리로
 * 만들고 있었다 — 2026-09-22 실측으로 이번 달에만 340건이 몰려 있어, 90칸이 전부 이번 달로 차고
 * 10월(66건), 12월(30건), 2027년(30건)이 **영영 화면에 못 올랐다**. 사용자가 잡아낸 자리다:
 * "2026년 9월 이렇게만 노출되는데 그럼 10월꺼 추가되면...?"
 *
 * 달마다 자르면 1년 안의 모든 달이 반드시 한 칸씩 갖는다. 24 는 넓은 화면 격자로 네 줄이라
 * 한 달이 화면 하나를 넘지 않는 선이다. 잘린 달은 머리에 전체 건수를 같이 적는다(화면 몫).
 */
export const UPCOMING_MONTH_LIMIT = 24;

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

/**
 * 같은 달에 나오는 것끼리 묶는다. key 는 "2026-10" — 라벨은 화면이 붙인다.
 * total 은 그 달의 **전체** 건수다(items 는 UPCOMING_MONTH_LIMIT 에서 잘린다) —
 * 둘이 다를 때 화면이 "잘랐다" 를 말할 수 있어야 한다.
 */
export type UpcomingMonth = {
  key: string;
  items: UpcomingEntry[];
  total: number;
};

async function getUpcomingGamesRaw(): Promise<UpcomingMonth[]> {
  const db = getDb();
  const visible = visiblePlatformsOnly();

  /*
   * 1) 게임 단위로 가장 이른 미래 날짜를 뽑고, **달 안에서** 순번을 매겨 자른다.
   *
   * 자르는 일을 SQL 이 하는 이유: 340건이 몰린 달의 행을 전부 받아 와 JS 에서 버리면
   * 그 달 하나 때문에 왕복 한 번에 수백 행이 실린다. 창(window) 함수는 같은 스캔 안에서 끝난다.
   *
   * drizzle 질의 빌더가 아니라 생 SQL 인 이유: row_number() over (partition by ...) 를
   * 표현할 자리가 빌더에 없다. 조건 조각(mainGamesOnly, visiblePlatformsOnly)은 그대로 끼워 넣어
   * 다른 화면과 같은 기준을 쓴다 — 여기서 손으로 다시 적으면 숨김 규칙이 갈린다.
   */
  const ranked = await db.execute<{ game_id: string; release_date: string; month_key: string; month_total: number }>(sql`
    with earliest as (
      select ${gamePlatforms.gameId} as game_id, min(${gamePlatforms.releaseDate}) as release_date
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
    ),
    by_month as (
      select
        game_id,
        release_date,
        -- date 컬럼이라 "YYYY-MM-DD" 로 온다. 앞 7글자가 곧 달 열쇠다 —
        -- Date 로 바꿔 달을 꺼내면 UTC 로 해석돼 매월 1일이 전달로 밀린다
        substr(release_date::text, 1, 7) as month_key,
        row_number() over (partition by substr(release_date::text, 1, 7) order by release_date asc, game_id asc) as rn,
        count(*) over (partition by substr(release_date::text, 1, 7)) as month_total
      from earliest
    )
    select game_id, release_date::text as release_date, month_key, month_total::int as month_total
    from by_month
    where rn <= ${UPCOMING_MONTH_LIMIT}::int
    order by release_date asc, game_id asc
  `);
  const dates = ranked.rows;
  if (dates.length === 0) return [];

  // 2) 고른 게임의 행을 전부 읽는다. 홈과 달리 fillPlatforms 가 필요 없다 —
  //    조인 결과를 상위 N행으로 자르지 않고 게임 id 로 좁히므로 플랫폼이 잘리지 않는다
  const ids = dates.map((d) => d.game_id);
  const rows = await db
    .select({ game: games, gp: gamePlatforms })
    .from(gamePlatforms)
    .innerJoin(games, eq(games.id, gamePlatforms.gameId))
    .where(and(inArray(gamePlatforms.gameId, ids), eq(gamePlatforms.region, HOME_REGION), visiblePlatformsOnly()));

  const summaries = await fillGenres(groupSummaries(rows, ids.length));
  const bySlug = new Map(summaries.map((s) => [s.slug, s]));
  const slugByGameId = new Map(rows.map((r) => [r.game.id, r.game.slug]));

  const months = new Map<string, { items: UpcomingEntry[]; total: number }>();
  for (const { game_id, release_date, month_key, month_total } of dates) {
    const slug = slugByGameId.get(game_id);
    const game = slug ? bySlug.get(slug) : undefined;
    if (!game) continue;
    const bucket = months.get(month_key) ?? { items: [], total: Number(month_total) };
    bucket.items.push({ game, releaseDate: release_date });
    months.set(month_key, bucket);
  }
  // Map 은 넣은 순서를 지킨다 — 1)의 날짜 오름차순이 그대로 달 순서가 된다
  return [...months].map(([key, { items, total }]) => ({ key, items, total }));
}

/** 출시예정 목록 — 태그 `home`. 수집이 새 출시일을 넣으면 크롤러가 무효화한다 */
export const getUpcomingGames = unstable_cache(getUpcomingGamesRaw, [DTO_CACHE_VERSION, "upcoming"], {
  tags: ["home"],
  revalidate: LIST_REVALIDATE_SECONDS,
});
