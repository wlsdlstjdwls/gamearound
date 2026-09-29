// 홈 데이터 — 할인, 신작, 뉴스 묶음. 캐시 태그 `home`(§4.5).
import { unstable_cache } from "next/cache";
import { and, asc, desc, eq, gt, isNotNull, sql } from "drizzle-orm";
import { getDb } from "@/server/db/client";
import { gamePlatforms, games, HOME_REGION, news } from "@/server/db/schema";
import { visiblePlatformsOnly } from "@/server/db/visibility";
import type { HomeData } from "./dto";
import { fillGenres, fillPlatforms, groupSummaries } from "./mappers";
import { mainGamesOnly } from "./filters";
import { DTO_CACHE_VERSION, LIST_REVALIDATE_SECONDS } from "@/lib/cache";
import { baseCurrencyFirst as baseCurrencyFirstExpr, dealOrder, popularityRankAgg } from "./popularity-order";

/** 홈 첫 줄 칸 수. 개인화 줄(personal.ts)도 같은 칸 수로 이 줄을 갈아 끼운다 */
export const HOME_LIMIT = 12;
const HOME_NEWS_LIMIT = 8;
/** 곧 할인 마감 줄 — 오른쪽 뉴스(8건)와 줄 수를 맞춘다. 두 기둥의 길이가 어긋나면 짧은 쪽 아래가 빈다 */
const HOME_ENDING_SOON_LIMIT = 8;

async function getHomeDataRaw(): Promise<HomeData> {
  const db = getDb();

  // 목록 화면과 같은 기준을 쓴다 — 홈만 다른 나라 가격을 섞으면 같은 게임이 두 화면에서 다른 값을 말한다
  const homeRegion = eq(gamePlatforms.region, HOME_REGION);
  const baseCurrencyFirst = baseCurrencyFirstExpr();

  // 게임 단위 인기 자리 — 개인화 줄(personal.ts)과 같은 조각을 쓴다
  const rankAgg = popularityRankAgg(db);

  /**
   * 오늘의 할인: 순서는 dealOrder(판매 순번 → 별점 → 환산 랭킹, 2026-09-29). 게임당 1개로 묶기 위해 넉넉히 가져와 JS에서 dedupe.
   * 개인화를 켠 사람에게는 이 줄이 personal.ts 의 줄로 갈아 끼워지고, 이 줄은 그 모자란 칸을 채운다.
   *
   * 2026-09-21 에 할인율순에서 인기순으로 바꿨다. 할인율로 세우면 "가장 많이 깎인 것" 이 오는데
   * 그건 대개 묵은 게임이다(lib/games-query 의 MIN_DISCOUNT_STEPS 주석이 이미 알던 사실이다).
   * 홈 첫 줄이 답해야 하는 질문은 "지금 살 만한 게 뭔가" 지 "무엇이 가장 깎였나" 가 아니다.
   *
   * 무료는 뺀다(2026-09-15). 100% 할인(에픽 무료 배포 등)은 할인율 정렬에서 늘 맨 앞에 서서
   * 첫 화면을 통째로 차지하는데, "할인 중인 게임" 이 답해야 하는 질문은 "얼마에 살까" 지
   * "공짜로 받을 게 있나" 가 아니다. 무료는 가격 필터(maxPrice=0)로 따로 찾는 축이다.
   *
   * 2026-09-21 에 PlayStation 순위를 붙여 "콘솔 독점작은 못 받는다" 던 한계를 풀었다 —
   * GTA VI 2위, 마블 울버린 3위, 고스트 오브 요테이 13위가 이 줄에 오른다.
   *
   * 순번을 아예 못 받는 스토어가 셋 남는다 — Xbox, 스위치, Epic. 셋 다 목록 정렬을 못 바꾼다
   * (각 어댑터의 listPopularPages 주석). Xbox 는 평가 수가, 평가 수조차 없는 스위치와 Epic 은
   * HLTB 기록 인원수가 그 자리를 메운다. 평가 수는 게임 단위로 모으지 않고 할인 행의 값만 읽는다 —
   * 집계를 넓히면 비용이 붙는다(rankAgg 주석, dealOrder 의 rowReviewRankExpr).
   *
   * 같은 자리 안에서 최신작을 먼저 두는 이유(2026-09-21 실측): 순번은 촘촘하지 않아 홈 12칸 중 8칸이
   * 동점이었고, 그걸 할인율로 깨면 "많이 깎인 묵은 것" 이 이겼다. 출시일로 **거르지는** 않는다 —
   * 3년 컷을 재어 보니 Baldur's Gate 3, RimWorld 가 빠지고 세대 호환 번들 셋이 그 자리를 채웠다.
   */
  const discountRows = await db
    .select({ game: games, gp: gamePlatforms })
    .from(gamePlatforms)
    .innerJoin(games, eq(gamePlatforms.gameId, games.id))
    .leftJoin(rankAgg, eq(rankAgg.gameId, games.id))
    .where(and(mainGamesOnly(), homeRegion, visiblePlatformsOnly(), gt(gamePlatforms.discountPct, 0), gt(gamePlatforms.currentPrice, 0)))
    .orderBy(...dealOrder(rankAgg))
    .limit(HOME_LIMIT * 4);

  /**
   * 곧 끝나는 할인 — **따로 묻는다**(2026-09-22, 사용자 지정: "지금 할인 중 게임과 곧 할인 마감
   * 게임이 겹치지 않게 해줘").
   *
   * 화면에서 거를 수 없는 문제였다. 전에는 홈이 discounts(12칸)에서 종료 시각 있는 것만 골라
   * 이 줄을 만들었는데, 같은 12칸에서 고르니 겹치지 않을 방법이 없었다.
   *
   * 정렬 기준도 다르다 — 위 줄은 인기순이고 이 줄은 **빨리 끝나는 순**이다. 인기순 웅덩이를 넓혀
   * 거기서 고르는 방법으로는 "가장 먼저 끝나는 할인" 이 그 웅덩이 밖에 있을 때 영영 못 잡는다.
   *
   * 넉넉히 받아 오는 이유(limit x 6): 게임 하나가 스토어 여러 줄로 오고(groupSummaries 가 접는다),
   * 그중 위 줄과 겹치는 게임을 JS 에서 버려야 한다.
   */
  const endingSoonRows = await db
    .select({ game: games, gp: gamePlatforms })
    .from(gamePlatforms)
    .innerJoin(games, eq(gamePlatforms.gameId, games.id))
    .where(
      and(
        mainGamesOnly(),
        homeRegion,
        visiblePlatformsOnly(),
        gt(gamePlatforms.discountPct, 0),
        gt(gamePlatforms.currentPrice, 0),
        // 이미 끝난 할인은 "곧 끝난다" 가 아니다. 종료 시각이 없는 행도 여기 설 수 없다
        sql`${gamePlatforms.discountEndsAt} > now()`,
      ),
    )
    .orderBy(asc(gamePlatforms.discountEndsAt), baseCurrencyFirst)
    .limit(HOME_ENDING_SOON_LIMIT * 6);

  // 최근 출시: 출시일 desc (미래 출시 제외)
  const releaseRows = await db
    .select({ game: games, gp: gamePlatforms })
    .from(gamePlatforms)
    .innerJoin(games, eq(gamePlatforms.gameId, games.id))
    .where(and(mainGamesOnly(), homeRegion, visiblePlatformsOnly(), isNotNull(gamePlatforms.releaseDate), sql`${gamePlatforms.releaseDate} <= current_date`))
    .orderBy(desc(gamePlatforms.releaseDate), baseCurrencyFirst)
    .limit(HOME_LIMIT * 4);

  const newsRows = await db
    .select({ n: news, slug: games.slug, titleKo: games.titleKo, titleEn: games.titleEn })
    .from(news)
    .leftJoin(games, eq(news.gameId, games.id))
    .orderBy(desc(news.publishedAt))
    .limit(HOME_NEWS_LIMIT);

  // 잘라 온 조인 행만으로는 배지가 빠진다 — 자른 뒤 게임 단위로 한 번 더 채운다(fillPlatforms 주석)
  const fill = async (rows: typeof discountRows, limit = HOME_LIMIT) => fillGenres(await fillPlatforms(groupSummaries(rows, limit)));
  const [discounts, recentReleases, endingSoonAll] = await Promise.all([
    fill(discountRows),
    fill(releaseRows),
    // 겹치는 것을 버린 뒤에 8칸을 채워야 해서 넉넉히 접는다
    fill(endingSoonRows, HOME_ENDING_SOON_LIMIT * 3),
  ]);
  // 위 줄에 이미 선 게임은 뺀다 — 같은 카드가 한 화면에 두 번 서면 두 마디가 서로를 베낀 것처럼 읽힌다
  const shown = new Set(discounts.map((g) => g.slug));
  const endingSoon = endingSoonAll.filter((g) => !shown.has(g.slug)).slice(0, HOME_ENDING_SOON_LIMIT);

  return {
    discounts,
    endingSoon,
    recentReleases,
    latestNews: newsRows.map(({ n, slug, titleKo, titleEn }) => ({
      id: n.id,
      title: n.title,
      url: n.url,
      sourceName: n.sourceName,
      thumbnailUrl: n.thumbnailUrl,
      publishedAt: n.publishedAt.toISOString(),
      game: slug && titleEn ? { slug, title: titleKo ?? titleEn } : null,
    })),
  };
}

/** 홈 데이터 — 태그 `home`. 크롤러 완료 시 /api/revalidate 가 항상 무효화 */
export const getHomeData = unstable_cache(getHomeDataRaw, [DTO_CACHE_VERSION, "home"], { tags: ["home"], revalidate: LIST_REVALIDATE_SECONDS });
