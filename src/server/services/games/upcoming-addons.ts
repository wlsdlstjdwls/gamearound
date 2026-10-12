// 출시예정 화면의 "기다리는 추가 콘텐츠" 줄(2026-10-12, 사용자: "기다리는 DLC도 좋다").
//
// 달 탭과 따로 선다. 출시 전 DLC 는 다 합쳐도 마흔 남짓이라(2026-10-12 실측 43건) 달로 쪼개면 칸마다 한두 장이다.
// 날짜 규칙은 본편 쪽(upcoming.ts 의 earliestCte)과 같다 — 모든 플랫폼의 가장 이른 날짜가 미래인 것만.
// 본편이 목록에 서는 게임(mainGamesOnly)인 DLC 만 담는다. 본편이 숨은 DLC 는 눌러 들어가도 이어 볼 데가 없다.
import { unstable_cache } from "next/cache";
import { sql } from "drizzle-orm";
import { getDb } from "@/server/db/client";
import { gamePlatforms, games, HOME_REGION } from "@/server/db/schema";
import { visiblePlatformsOnly } from "@/server/db/visibility";
import { DTO_CACHE_VERSION, LIST_REVALIDATE_SECONDS } from "@/lib/cache";
import { POPULARITY_RANK_MAX_AGE_DAYS } from "@/lib/games/popularity";
import { pickUpcomingAddons } from "@/lib/games/upcoming";
import { mainGamesOnly } from "./filters";
import { toUpcomingEntries, UPCOMING_WINDOW_DAYS, type UpcomingEntry } from "./upcoming";

/** 보여 줄 장 수. 넓은 화면 격자 두 줄이다 — 달 목록보다 앞서 길어지면 이 화면의 본론이 밀린다 */
export const UPCOMING_ADDON_LIMIT = 8;

/**
 * 고르기 전에 받아 올 후보 수. 사운드트랙, 아트북을 거르고 나면 절반쯤 남는다(2026-10-12 실측 43건 중 절반) —
 * 상한의 다섯 배면 걸러도 모자라지 않는다
 */
const UPCOMING_ADDON_CANDIDATES = UPCOMING_ADDON_LIMIT * 5;

export type UpcomingAddonEntry = UpcomingEntry & { parentTitle: string };

type CandidateRow = { game_id: string; release_date: string; slug: string; title: string; parent_title: string };

async function getUpcomingAddonsRaw(): Promise<UpcomingAddonEntry[]> {
  const visible = visiblePlatformsOnly();
  // 본편을 games 이름 그대로 두고 DLC 를 child 로 부른다 — mainGamesOnly 조각이 games 를 가리키므로 본편에 걸린다.
  // 고르는 순서는 본편 인기순이다. DLC 자신은 순번이 거의 없고(출시 전이다), 기다리는 사람 수는 본편이 말한다
  const res = await getDb().execute<CandidateRow>(sql`
    with earliest as (
      select ${gamePlatforms.gameId} as game_id, min(${gamePlatforms.releaseDate}) as release_date
      from ${gamePlatforms}
      inner join ${games} on ${games.id} = ${gamePlatforms.gameId}
      where ${games.contentType} = 'dlc' and ${games.visibility} = 'public' and ${games.parentGameId} is not null
        and ${gamePlatforms.region} = ${HOME_REGION}
        ${visible ? sql`and ${visible}` : sql``}
      group by ${gamePlatforms.gameId}
      having min(${gamePlatforms.releaseDate}) > current_date
        and min(${gamePlatforms.releaseDate}) <= current_date + ${UPCOMING_WINDOW_DAYS}::int
    )
    select e.game_id, e.release_date::text as release_date, child.slug,
      coalesce(child.title_ko, child.title_en) as title,
      coalesce(${games.titleKo}, ${games.titleEn}) as parent_title
    from earliest e
    inner join games child on child.id = e.game_id
    inner join ${games} on ${games.id} = child.parent_game_id
    where ${mainGamesOnly()}
    order by (
      select min(pp.popularity_rank) from game_platforms pp
      where pp.game_id = ${games.id}
        and pp.popularity_rank_at >= now() - make_interval(days => ${POPULARITY_RANK_MAX_AGE_DAYS}::int)
    ) asc nulls last, e.release_date asc, e.game_id asc
    limit ${UPCOMING_ADDON_CANDIDATES}::int
  `);

  const picked = pickUpcomingAddons(
    res.rows.map((r) => ({ ...r, releaseDate: r.release_date })),
    UPCOMING_ADDON_LIMIT,
  );
  // toUpcomingEntries 는 게임 id 를 돌려주지 않아 slug 로 본편 이름을 되짚는다
  const parentBySlug = new Map(picked.map((p) => [p.slug, p.parent_title]));
  const entries = await toUpcomingEntries(picked);
  return entries.map((e) => ({ ...e, parentTitle: parentBySlug.get(e.game.slug) ?? "" }));
}

/** 태그 `home` — 수집이 새 출시일을 넣으면 출시예정 달 목록과 같이 무효화된다 */
export const getUpcomingAddons = unstable_cache(getUpcomingAddonsRaw, [DTO_CACHE_VERSION, "upcoming-addons"], {
  tags: ["home"],
  revalidate: LIST_REVALIDATE_SECONDS,
});
