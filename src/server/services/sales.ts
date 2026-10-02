// 지금 열려 있는 스팀 정기 세일 — 홈 배너가 읽는다. 캐시 태그 `home`.
//
// 판정 규칙은 lib/sales/detect 에 있다(달력의 종료 시각과 데이터의 종료 시각 묶음이 맞을 때만).
// 여기는 묶음을 세어 넘기기만 한다.
//
// 게임 수로 센다(행이 아니라): 배너의 숫자와 그 배너가 여는 목록(?event=)의 건수가 같아야 해서다.
// 목록은 본편만 세므로 여기도 mainGamesOnly 를 탄다 — DLC 행까지 세면 배너가 목록보다 큰 수를 말한다.
import { unstable_cache } from "next/cache";
import { and, eq, gt, sql } from "drizzle-orm";
import { getDb } from "@/server/db/client";
import { gamePlatforms, games, HOME_REGION } from "@/server/db/schema";
import { DTO_CACHE_VERSION, LIST_REVALIDATE_SECONDS } from "@/lib/cache";
import { SALE_DETECT_MIN_ROWS, detectRunningSale } from "@/lib/sales/detect";
import { mainGamesOnly } from "./games/filters";

export type RunningSaleDto = {
  key: string;
  name: string;
  /** ISO 문자열 — 캐시가 직렬화하므로 Date 를 싣지 않는다 */
  endsAt: string;
  gameCount: number;
};

async function getRunningSteamSaleRaw(): Promise<RunningSaleDto | null> {
  const db = getDb();
  const count = sql<number>`count(distinct ${gamePlatforms.gameId})::int`;
  const rows = await db
    .select({ endsAt: gamePlatforms.discountEndsAt, count })
    .from(gamePlatforms)
    .innerJoin(games, eq(games.id, gamePlatforms.gameId))
    .where(
      and(
        mainGamesOnly(),
        eq(gamePlatforms.platform, "steam"),
        eq(gamePlatforms.region, HOME_REGION),
        gt(gamePlatforms.discountPct, 0),
        gt(gamePlatforms.discountEndsAt, sql`now()`),
      ),
    )
    .groupBy(gamePlatforms.discountEndsAt)
    // 문턱 아래 묶음은 판정에 쓰일 일이 없다 — 수천 개의 낱개 종료 시각을 실어 나르지 않는다.
    // ::int 를 붙이는 이유: 바인딩이 text 로 추론되면 비교가 깨진다(games/list 의 reviewRankExpr 주석과 같은 함정)
    .having(sql`${count} >= ${SALE_DETECT_MIN_ROWS}::int`);

  const hit = detectRunningSale(
    new Date(),
    rows.flatMap((r) => (r.endsAt ? [{ endsAt: r.endsAt, count: r.count }] : [])),
  );
  return hit ? { key: hit.key, name: hit.name, endsAt: hit.endsAt.toISOString(), gameCount: hit.count } : null;
}

/** 홈 데이터와 같은 태그 — 크롤러가 끝날 때 /api/revalidate 가 `home` 을 늘 무효화한다 */
export const getRunningSteamSale = unstable_cache(getRunningSteamSaleRaw, [DTO_CACHE_VERSION, "running-steam-sale"], {
  tags: ["home"],
  revalidate: LIST_REVALIDATE_SECONDS,
});
