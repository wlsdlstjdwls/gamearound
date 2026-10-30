// 시각 칸을 한국 날짜 글자("2026-10-30")로 묶는 SQL 조각. 매출현황과 이용현황 질의가 같이 쓴다(lib/stats/period 의 날짜 열쇠와 같은 꼴).
import { sql, type SQL } from "drizzle-orm";
import type { AnyPgColumn } from "drizzle-orm/pg-core";

/** 묶는 시간대. 화면 날짜(lib/format 의 DISPLAY_TIME_ZONE)와 같다 */
const ZONE = "Asia/Seoul";
const DAY_FORMAT = "YYYY-MM-DD";

export function kstDay(col: AnyPgColumn): SQL<string> {
  return sql<string>`to_char((${col}) at time zone ${sql.raw(`'${ZONE}'`)}, ${sql.raw(`'${DAY_FORMAT}'`)})`;
}
