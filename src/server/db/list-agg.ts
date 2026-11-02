// 목록 정렬, 필터가 쓰는 게임별 플랫폼 집계 — 식이 놓이는 한 곳.
//
// 두 군데가 이 식을 쓴다: 목록 질의(services/games/list)가 플랫폼을 골랐을 때 그 자리에서 집계하고,
// 수집(sync/list-stats)이 플랫폼을 고르지 않은 집계를 game_list_stats 에 미리 써 둔다.
// 식이 두 벌이면 같은 게임이 "전체" 와 "PS5" 목록에서 다른 할인율로 정렬된다. 그래서 db 계층에 하나만 둔다.
import { and, eq, inArray, sql, type SQL } from "drizzle-orm";
import { DISPLAY_CURRENCY } from "@/lib/currency";
import { POPULARITY_RANK_MAX_AGE_DAYS } from "@/lib/games/popularity";
import { getDb } from "./client";
import { gamePlatforms, HOME_REGION, type Platform } from "./schema";
import { visiblePlatformsOnly } from "./visibility";

/**
 * 게임별 플랫폼 집계 질의. platform 을 주면 그 플랫폼만 집계하므로
 * inner join 하는 것만으로 "그 플랫폼을 가진 게임"으로 좁혀진다.
 * 별칭(as)은 game_list_stats 의 열 이름과 같다 — sync 가 이 질의를 그대로 그 표에 붓는다.
 */
export function listAggQuery(platforms: Platform[], onlyGames?: SQL) {
  return getDb()
    .select({
      gameId: gamePlatforms.gameId,
      maxDiscount: sql<number>`max(coalesce(${gamePlatforms.discountPct}, 0))`.as("max_discount"),
      /**
       * 기준 통화로 살 수 있는 게임인가. 할인율순의 첫 정렬 키다.
       *
       * 왜 필요한가: 원화 가격이 없는 게임이 할인율만으로 첫 화면을 차지하는 것을 막는다.
       * 환산은 하지 않으므로(lib/currency) 남은 손잡이는 순서뿐이다 — 원화로 살 수 있는 것을
       * 먼저 세우고, 나머지는 뒤에 그대로 둔다.
       *
       * 이 키를 넣은 계기는 달러 전용 스토어였다(2026-09-15 실측: 4,910개 중 1,490개가 원화 없음).
       * 2026-09-16 에 그 스토어를 숨기면서 수가 **26개**로 줄었다(일본 스위치 행). 그래도 키는 남긴다 —
       * 26개가 첫 화면을 먹는 것도 같은 문제고, 지역이 늘면 그 수는 다시 는다.
       */
      hasBaseCurrency: sql<boolean>`bool_or(${gamePlatforms.currency} = ${DISPLAY_CURRENCY} and ${gamePlatforms.currentPrice} is not null)`.as("has_base_currency"),
      // 통화가 섞인 min() 은 뜻이 없다 — 정렬 기준은 기준 통화 가격만 본다(외화 전용 게임은 가격 정렬에서 nulls last)
      minPrice: sql<number | null>`min(${gamePlatforms.currentPrice}) filter (where ${gamePlatforms.currency} = ${DISPLAY_CURRENCY})`.as("min_price"),
      /**
       * "최신 출시순" 이 세는 값. **이미 나온 날짜만** 본다(2026-09-18).
       * 미래 날짜를 그대로 세면 아직 못 사는 게임이 첫 페이지를 통째로 차지한다 —
       * 이 목록이 답하는 질문은 "무엇이 나왔나" 고, "무엇을 기다리나" 는 /upcoming 이 맡는다.
       */
      maxRelease: sql<string | null>`max(${gamePlatforms.releaseDate}) filter (where ${gamePlatforms.releaseDate} <= current_date)`.as("max_release"),
      /**
       * 평가 수(스팀, Xbox 가 기존 요청에 얹어 준다). 인기순의 **두 번째** 키다.
       *
       * 왜 필요한가: 순번은 상위 2,000위까지만 있고 카탈로그는 7만 건이다. 순번 없는 뒷줄이
       * 무순서면 거기서 다시 할인율이 기준이 되고, 그러면 묵은 싸구려가 또 앞에 선다.
       * 평가 수는 판매량 추정의 표준 대리지표다 — 순번 다음으로 좋은 근거다.
       *
       * PS 는 이 값을 주지 않는다(1MB HTML 을 긁어야 한다). 그래서 PS 독점작은 여전히
       * 두 근거를 다 못 받는다 — 그건 PS 인기 목록을 붙여야 풀린다.
       */
      maxReviews: sql<number | null>`max(${gamePlatforms.userScoreCount})`.as("max_reviews"),
      /** 한국어 지원을 밝힌 행이 하나라도 있나. 모르는 행(null)은 bool_or 가 건너뛴다 */
      koText: sql<boolean | null>`bool_or(${gamePlatforms.koText})`.as("ko_text"),
      /**
       * 기준 통화로 **값을 받고 파는** 행이 하나라도 있나. 평가 수를 순번 자리로 바꿀 자격이다.
       * hasBaseCurrency 와 다른 값이다 — 저쪽은 가격이 있기만 하면 참이라 무료(0)도 참이 된다.
       */
      hasPaidPrice: sql<boolean>`bool_or(${gamePlatforms.currency} = ${DISPLAY_CURRENCY} and ${gamePlatforms.currentPrice} > 0)`.as("has_paid_price"),
      /**
       * "인기순" 이 세는 값 — 스토어 인기순위에서 이 게임의 가장 높은 자리(작은 수가 앞).
       *
       * **낡은 순번은 여기서 버린다**(POPULARITY_RANK_MAX_AGE_DAYS). 순위에서 빠진 게임은
       * 갱신할 기회가 없어 마지막 순번으로 굳는데, 그걸 그대로 세면 "인기순" 이
       * "한때 인기였던 순" 이 된다. 거르는 자리를 읽는 쪽에 두는 이유는 쓰는 쪽이 지울 수 없어서다 —
       * 목록 밖으로 나간 게임은 다음 수집에 나타나지 않으므로 아무도 그 행을 찾아가지 않는다.
       *
       * 여러 기기에 순번이 있으면 가장 높은 자리를 쓴다. 게임 하나의 인기는 그중 앞선 쪽이다.
       */
      minRank: sql<number | null>`min(${gamePlatforms.popularityRank}) filter (
        where ${gamePlatforms.popularityRankAt} >= now() - make_interval(days => ${POPULARITY_RANK_MAX_AGE_DAYS})
      )`.as("min_rank"),
    })
    .from(gamePlatforms)
    // 목록의 최저가, 할인, 발매일은 기준 지역(한국) 행만 본다. 다른 나라 가격을 섞으면
    // 카드의 할인 배지가 한국에서 살 수 없는 할인을 가리킨다 — 상세 화면에서만 참고로 보여 준다
    // onlyGames 는 수집이 바뀐 게임만 다시 쓸 때 거는 게임 조건이다(sync/list-stats 의 refreshListStatsFor)
    .where(and(eq(gamePlatforms.region, HOME_REGION), visiblePlatformsOnly(), platforms.length > 0 ? inArray(gamePlatforms.platform, platforms) : undefined, onlyGames))
    .groupBy(gamePlatforms.gameId);
}

/** game_list_stats 에 붓는 열 순서. listAggQuery 의 select 순서와 같아야 한다 */
export const LIST_AGG_COLUMNS = [
  "game_id", "max_discount", "has_base_currency", "min_price", "max_release",
  "max_reviews", "ko_text", "has_paid_price", "min_rank",
] as const;
