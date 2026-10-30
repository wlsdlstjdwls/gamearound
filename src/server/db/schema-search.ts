// 결과가 0건이던 검색어(2026-10-30). 카탈로그 구멍을 데이터로 보려고 센다 — 한글 별칭이 본편의 5% 뿐이라(korean-search-alias-gap)
// "있는데 못 찾는 것" 과 "정말 없는 것" 이 섞여 있다. 어느 쪽이든 많이 찾은 말부터 채운다.
//
// 사람이 "추가 요청" 을 누른 말은 데이터 점검(data_issues, rule=search_request)에도 한 줄 올라가 관리자 데이터오류관리 화면에 선다.
// 0건 검색을 모두 거기 올리지 않는 이유: 오타, 한 글자 검색까지 매일 수백 줄이 쌓여 기계가 찾은 문제가 묻힌다(schema-quality 머리 주석과 같은 걱정).
//
// 파일을 가른 이유는 다른 schema-* 와 같다. schema.ts 에서 재수출하므로 호출부 import 경로는 그대로다.
import { index, integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { auditColumns } from "./audit";

export const searchMisses = pgTable(
  "search_misses",
  {
    /** 정규화한 검색어(lib/search/miss 의 normalizeMissQuery). 띄어쓰기, 대소문자만 다른 말은 한 줄로 센다 */
    queryKey: text("query_key").primaryKey(),
    /** 마지막으로 들어온 원문. 관리자가 읽는 글은 이쪽이다 */
    query: text("query").notNull(),
    missCount: integer("miss_count").default(1).notNull(),
    /** "이 게임 추가 요청" 을 누른 수 */
    requestCount: integer("request_count").default(0).notNull(),
    lastMissedAt: timestamp("last_missed_at", { withTimezone: true }).defaultNow().notNull(),
    ...auditColumns(),
  },
  // 관리자가 "많이 찾은 순" 으로 본다
  (t) => [index("search_misses_count_idx").on(t.missCount)],
);
