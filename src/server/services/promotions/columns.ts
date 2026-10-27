// 걸기 줄 하나의 성과 합(노출, 클릭). 관리자 목록(slots)과 산 사람의 성과 화면(performance)이 같은 식을 쓴다.
import "server-only";
import { sql } from "drizzle-orm";
import { promotionBoosts, promotionImpressions } from "@/server/db/schema";

export function impressionSum(col: typeof promotionImpressions.views | typeof promotionImpressions.clicks) {
  return sql<number>`coalesce((select sum(${col}) from ${promotionImpressions} where ${promotionImpressions.boostId} = ${promotionBoosts.id}), 0)::int`;
}
