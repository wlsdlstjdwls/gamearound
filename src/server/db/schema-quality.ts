// 데이터 점검기가 찾은 문제(sync/quality). 자동으로 고친 것도, 사람에게 묻는 것도 한 줄씩 남긴다.
//
// 자동으로 고친 것까지 남기는 이유: 기계가 고친 값이 틀렸을 때 "언제, 무슨 근거로 바뀌었나" 를 찾을 자리가 있어야 한다.
// 칸 잠금(data_corrections)은 무엇이 잠겼는지만 말하고 왜 바뀌었는지는 모른다.
//
// 왜 관리자 할 일 판(admin_tasks)이 아닌가: 할 일 판은 사람이 적는 자리로 정해 뒀다(schema-admin 머리 주석).
// 기계가 거기에 매일 수십 줄을 쓰면 사람의 일이 묻힌다.
//
// 파일을 가른 이유는 다른 schema-* 와 같다. schema.ts 에서 재수출하므로 호출부 import 경로는 그대로다.
import { index, jsonb, pgEnum, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { auditColumns } from "./audit";
import { games } from "./schema";

/**
 * open      사람이 볼 차례(candidate, notify)
 * applied   고침이 들어갔다(auto 는 처음부터 이 상태로 쌓인다)
 * dismissed 사람이 "아니에요" 로 넘겼다. 같은 문제가 다시 나와도 다시 올리지 않는다
 */
export const dataIssueStatusEnum = pgEnum("data_issue_status", ["open", "applied", "dismissed"]);
export type DataIssueStatus = (typeof dataIssueStatusEnum.enumValues)[number];

export const dataIssues = pgTable(
  "data_issues",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /** sync/quality/rules 의 QualityRule. enum 으로 두지 않은 이유: 규칙은 자주 늘고, 늘 때마다 마이그레이션을 부르면 안 된다 */
    rule: text("rule").notNull(),
    /** 규칙 안에서 같은 문제를 가리키는 열쇠(대개 게임 id 나 플랫폼 행 id). 다시 찾아도 한 줄로 남는다 */
    subjectKey: text("subject_key").notNull(),
    /** auto | candidate | notify */
    verdict: text("verdict").notNull(),
    gameId: uuid("game_id").references(() => games.id, { onDelete: "cascade" }),
    reason: text("reason").notNull(),
    /** 적용할 고침(rules 의 QualityFix). notify 는 null */
    fix: jsonb("fix"),
    status: dataIssueStatusEnum("status").default("open").notNull(),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    ...auditColumns(),
  },
  (t) => [uniqueIndex("data_issues_rule_subject_uq").on(t.rule, t.subjectKey), index("data_issues_status_idx").on(t.status, t.createdAt)],
);
