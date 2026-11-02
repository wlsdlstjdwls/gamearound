// 목록(/games) 정렬, 필터가 읽는 게임별 집계를 미리 담아 두는 표.
//
// 왜 있나(2026-11-02 실측): 옛 DB 를 병합해 카탈로그가 7배(게임 78k, 플랫폼 행 114k)가 되자
// 목록 질의가 요청마다 플랫폼 행 전체를 게임별로 집계했다. 집계 하나가 약 170ms 이고 병렬 작업자 셋이
// 같은 집계를 각자 다시 해서, 건수 질의 520ms, 목록 질의 400~780ms 가 나왔다. 계획은 이미 최적이라
// 인덱스로 줄일 것이 없다(games-list-query-cost 메모의 결론과 같다) — 집계를 미리 해 두는 수밖에 없다.
//
// 무엇을 담나: 플랫폼을 고르지 않은 목록의 집계 하나만. 플랫폼을 고르면 집계 범위가 달라지는데,
// 그 경우는 행 수가 몇 분의 일로 줄어 그대로 집계해도 견딜 만하다(실측 ps5 필터 첫 바이트 0.32초).
//
// 누가 채우나: sync/list-stats 가 수집 실행이 끝날 때 통째로 다시 쓴다. 집계식은 db/list-agg 하나뿐이라
// 이 표와 그대로 집계하는 길이 서로 다른 답을 낼 수 없다. 인기 순번의 "낡은 순번 버리기"는 다시 쓴 시각 기준이다 —
// 수집이 하루 여러 번 돌아 늦어도 몇 시간이다.
import { boolean, date, integer, pgTable, uuid } from "drizzle-orm/pg-core";
import { auditColumns } from "./audit";
import { games } from "./schema";

export const gameListStats = pgTable("game_list_stats", {
  gameId: uuid("game_id").primaryKey().references(() => games.id, { onDelete: "cascade" }),
  maxDiscount: integer("max_discount").notNull(),
  hasBaseCurrency: boolean("has_base_currency").notNull(),
  minPrice: integer("min_price"),
  maxRelease: date("max_release"),
  maxReviews: integer("max_reviews"),
  koText: boolean("ko_text"),
  // 기준 통화 행이 있어도 가격을 하나도 못 읽었으면 null 이다(bool_or 가 null 만 받는다). 목록 식은 null 을 거짓으로 읽는다
  hasPaidPrice: boolean("has_paid_price"),
  minRank: integer("min_rank"),
  ...auditColumns(),
});
