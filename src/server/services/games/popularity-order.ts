// 인기순 정렬 조각 — 홈 첫 줄의 공통 순서와 개인화 순서가 같은 식을 쓴다.
// 두 벌이 순서를 따로 정하면 "취향 칸 다음에 채운 칸" 이 서로 다른 잣대로 줄을 선다.
import { and, desc, isNotNull, sql } from "drizzle-orm";
import type { getDb } from "@/server/db/client";
import { gamePlatforms, games } from "@/server/db/schema";
import { DISPLAY_CURRENCY } from "@/lib/currency";
import { HLTB_RANK_OFFSET, HLTB_RANK_STEPS, POPULARITY_RANK_MAX_AGE_DAYS, RATING_MIN_REVIEWS, REVIEW_RANK_STEPS } from "@/lib/games/popularity";

type Db = ReturnType<typeof getDb>;

/**
 * HLTB 기록 인원수를 순번 자리로 바꾼다 — 목록(list.ts 의 hltbRankExpr)과 같은 표를 본다.
 *
 * 홈이 평가 수 환산은 못 쓰면서 이것은 쓰는 이유: 평가 수는 game_platforms 집계를 넓혀야 해서
 * 0.7초가 3.5초가 됐지만(아래 rankAgg 주석), 기록 인원수는 games 컬럼이라 이미 있는
 * inner join 에서 그냥 읽힌다. 조인도 집계도 늘지 않는다.
 */
export function hltbRankExpr() {
  const steps = HLTB_RANK_STEPS.map(([position, logged]) => sql`when ${games.hltbLoggedCount} >= ${logged}::int then ${position + HLTB_RANK_OFFSET}::int`);
  return sql`(case ${sql.join(steps, sql` `)} else null::int end)`;
}

/**
 * 게임 하나의 인기순위 자리. **행이 아니라 게임 단위**로 묶는 이유가 중요하다 —
 * 순번은 스토어가 알려 주는 값이라 지금은 스팀 행에만 붙는다. 조인한 행의 순번을 그대로 세우면
 * 같은 게임의 PS5 할인 행은 순번이 비어 뒤로 밀린다. 게임이 어느 기기에서든 순위에 있으면
 * 그 게임이 인기인 것이다.
 *
 * 낡은 순번은 여기서 버린다(lib/games/popularity 의 주석). 순번 가진 행은 한 줌이라
 * 부분 인덱스만 훑고 끝난다 — 전체 스캔이 아니다.
 */
export function popularityRankAgg(db: Db) {
  return db
    .select({
      gameId: gamePlatforms.gameId,
      minRank: sql<number>`min(${gamePlatforms.popularityRank})`.as("min_rank"),
    })
    .from(gamePlatforms)
    /**
     * where 로 좁히는 것이 핵심이다 — 부분 인덱스(gp_popularity_rank_idx)만 훑고 끝난다.
     *
     * 목록(list.ts)처럼 평가 수까지 같이 집계하려다 되돌렸다(2026-09-21 실측): 조건을 filter 절로
     * 옮기고 지역 전체를 훑게 하니 **0.7~1.2초에서 2.5~3.5초**가 됐다(KR 행 85,408건).
     * 그 값이 필요하지도 않았다 — 순번 가진 할인 게임이 720건인데 홈은 12칸이라
     * 두 번째 키까지 갈 일이 없다. 목록에서는 이미 도는 집계에 얹는 거라 공짜다(그쪽엔 남겼다).
     */
    .where(
      and(
        isNotNull(gamePlatforms.popularityRank),
        sql`${gamePlatforms.popularityRankAt} >= now() - make_interval(days => ${POPULARITY_RANK_MAX_AGE_DAYS})`,
      ),
    )
    .groupBy(gamePlatforms.gameId)
    .as("rank_agg");
}

/**
 * 기준 통화 우선. 할인율만으로 세우면 첫 화면이 통째로 달러가 된다 —
 * 원화 가격이 없는 게임이 1,490개였고 그쪽 할인이 -95% 대였다(2026-09-15 실측, 달러 전용 스토어).
 * 환산은 하지 않으므로(lib/currency) 남은 손잡이는 순서뿐이다. 목록의 hasBaseCurrency 와 같은 규칙.
 */
export function baseCurrencyFirst() {
  return sql`(${gamePlatforms.currency} = ${DISPLAY_CURRENCY}) desc`;
}

/**
 * 평가 수를 순번 자리로 바꾸는 식 — **행 단위**다. 목록(list.ts 의 reviewRankExpr)은 게임 단위 집계의
 * 최댓값을 보지만, 홈에서 그 집계를 넓히면 0.7초가 3.5초가 된다(popularityRankAgg 주석).
 * 할인 행에 붙은 평가 수만 읽으면 조인도 집계도 늘지 않는다. 유료 조건은 할인 질의의
 * `current_price > 0` 이 이미 걸고 있다(무료에 자리를 주지 않는 근거는 표 옆 주석).
 * ::int 는 바인딩이 text 로 추론돼 least/coalesce 가 깨지는 것을 막는다(list.ts 의 같은 주석).
 */
function rowReviewRankExpr() {
  const steps = REVIEW_RANK_STEPS.map(([position, reviews]) => sql`when ${gamePlatforms.userScoreCount} >= ${reviews}::int then ${position}::int`);
  return sql`(case ${sql.join(steps, sql` `)} else null::int end)`;
}

/**
 * 할인 줄 순서(2026-09-29 사용자 지정: "판매량 높은순, 별점 높은순, 랭킹 높은순").
 *
 * 1. 판매 순번 — 스토어가 준 진짜 순번(psstore 는 30일 판매, steam 은 topsellers). 판매량을 공개하는
 *    스토어가 없어 이것이 판매량에 가장 가까운 값이다
 * 2. 별점 — 그 할인 행의 유저 점수, 평가 수가 RATING_MIN_REVIEWS 이상일 때만. steam 은 긍정 비율,
 *    Xbox 는 별점 x 20 이라 뜻이 조금 다르지만 둘 다 0~100 에서 높을수록 좋은 값이다(schema 의 userScore 주석)
 * 3. 랭킹 — 순번이 없는 게임에 주는 환산 자리(평가 수 환산, HLTB 환산 중 앞선 쪽)
 * 4. 동점 깨기 — 최신작, 할인율, 최근 갱신
 *
 * 판매량과 랭킹을 이렇게 가른 이유: 둘 다 "인기순위" 라는 같은 칸을 가리켜서, 진짜 순번을 판매량 쪽에,
 * 환산으로 만든 자리를 랭킹 쪽에 두었다. 별점이 그 사이에 서므로 순번 없는 게임끼리는 별점이 먼저 가른다.
 * 기준 통화 우선이 맨 앞인 이유는 baseCurrencyFirst 주석과 같다.
 */
export function dealOrder(rankAgg: ReturnType<typeof popularityRankAgg>) {
  return [
    baseCurrencyFirst(),
    sql`${rankAgg.minRank} asc nulls last`,
    sql`(case when ${gamePlatforms.userScoreCount} >= ${RATING_MIN_REVIEWS}::int then ${gamePlatforms.userScore} else null::int end) desc nulls last`,
    sql`least(${rowReviewRankExpr()}, ${hltbRankExpr()}) asc nulls last`,
    sql`${gamePlatforms.releaseDate} desc nulls last`,
    desc(gamePlatforms.discountPct),
    desc(gamePlatforms.lastSyncedAt),
  ];
}
