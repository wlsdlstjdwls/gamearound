// 모든 테이블이 공유하는 감사 컬럼 — 누가, 언제, 무엇으로 이 행을 만들고 고쳤나.
//
// 왜 헬퍼로 두나: 규칙이 "예외 없이 전 테이블" 이다. 테이블마다 여섯 줄을 손으로 적으면
// 언젠가 한 테이블이 빠지고, 하필 그 테이블에서 "누가 바꿨나" 를 물어보게 된다.
//
// 왜 actor 가 uuid 하나로 안 되나: 이 레포는 쓰기의 대부분을 크롤러가 한다.
// `created_by` 를 users 로만 두면 크론이 만든 행은 행위자 칸이 영원히 비어 있고,
// 그 빈칸이 "사람이 안 만졌다" 는 뜻인지 "기록을 안 했다" 는 뜻인지 구분되지 않는다.
// 그래서 사람은 `*_by`(uuid), 기계는 `*_source`(문자열)에 적는다. 둘 다 비면 출처 불명이다.
//
// 왜 users 외래키를 안 거나: 감사 기록은 사용자가 탈퇴해도 남아야 한다.
// 외래키를 걸면 탈퇴에서 cascade 로 지우거나 set null 로 비우게 되는데, 둘 다 이력을 잃는다.
import { sql } from "drizzle-orm";
import { timestamp, uuid, text } from "drizzle-orm/pg-core";

/** `*_source` 에 들어가는 값의 모양. 기계가 쓴 행은 무엇이 썼는지까지 적는다 */
export type AuditSource =
  | "user"
  | "admin"
  | "system"
  | `crawler:${string}`
  | `cron:${string}`
  | `shop:${string}`
  | `integration:${string}`;

/**
 * 모든 `pgTable` 정의가 펼쳐 쓴다.
 *
 * ```ts
 * export const foo = pgTable("foo", { id: uuid("id").primaryKey(), ...auditColumns() });
 * ```
 *
 * `updated_at` 을 DB 트리거로 걸지 않는 이유: sync 는 "값이 실제로 달라질 때만 UPDATE" 한다
 * (AGENTS §7). 트리거를 걸면 안 바뀐 행까지 시각이 움직여 그 규칙이 무의미해진다.
 * 쓰기 경로(services, sync)에서 채운다.
 */
export function auditColumns() {
  return {
    createdBy: uuid("created_by"),
    createdSource: text("created_source"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedBy: uuid("updated_by"),
    updatedSource: text("updated_source"),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  };
}

/** 행위자를 한 번에 채운다. 쓰기 경로가 직접 컬럼 이름을 적지 않게 한다 */
export function createdBy(source: AuditSource, userId?: string) {
  return { createdSource: source, createdBy: userId ?? null, updatedSource: source, updatedBy: userId ?? null };
}

/** 갱신 때 쓰는 짝. `updated_at` 을 여기서 같이 올린다 */
export function updatedBy(source: AuditSource, userId?: string) {
  return { updatedSource: source, updatedBy: userId ?? null, updatedAt: sql`now()` };
}
