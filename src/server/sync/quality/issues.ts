// 데이터 점검 판정 줄(data_issues) 쓰기. 크론이 판정을 쌓고, 관리자 화면이 적용하거나 넘긴다.
import { and, eq, inArray, sql } from "drizzle-orm";
import type { Db } from "@/server/db/client";
import { dataIssues, type DataIssueStatus } from "@/server/db/schema";
import { createdBy, updatedBy, type AuditSource } from "@/server/db/audit";
import type { QualityFinding } from "./rules";

/**
 * 판정 여러 줄을 한 문장으로 넣는다(같은 열쇠가 있으면 근거와 고침만 새로). 줄마다 보내면 Neon 왕복이 그대로 쌓인다.
 * 넘긴(dismissed) 줄은 부르는 쪽이 미리 걸러 낸다 — 여기서는 상태를 status 로 덮는다.
 */
export async function upsertIssues(db: Db, rows: Array<QualityFinding & { status: DataIssueStatus }>, source: AuditSource): Promise<void> {
  if (rows.length === 0) return;
  await db
    .insert(dataIssues)
    .values(
      rows.map((f) => ({
        rule: f.rule,
        subjectKey: f.subjectKey,
        verdict: f.verdict,
        gameId: f.gameId,
        reason: f.reason,
        fix: f.fix,
        status: f.status,
        resolvedAt: f.status === "open" ? null : new Date(),
        ...createdBy(source),
      })),
    )
    .onConflictDoUpdate({
      target: [dataIssues.rule, dataIssues.subjectKey],
      set: {
        verdict: sql`excluded.verdict`,
        reason: sql`excluded.reason`,
        fix: sql`excluded.fix`,
        status: sql`excluded.status`,
        resolvedAt: sql`excluded.resolved_at`,
        ...updatedBy(source),
      },
    });
}

/**
 * 이번 회차에 다시 안 나온 열린 줄을 지운다 — 그 사이 누가 손으로 고쳤거나 수집이 값을 채운 것이다.
 * 남겨 두면 관리자가 이미 풀린 문제를 들여다보게 된다. 적용, 넘김 기록은 이력이라 지우지 않는다(열린 줄만 지운다).
 */
export async function deleteOpenIssues(db: Db, ids: string[]): Promise<number> {
  if (ids.length === 0) return 0;
  const gone = await db
    .delete(dataIssues)
    .where(and(eq(dataIssues.status, "open"), inArray(dataIssues.id, ids)))
    .returning({ id: dataIssues.id });
  return gone.length;
}

/** 관리자가 적용하거나 넘긴 줄의 상태를 바꾼다. 열린 줄만 바꾼다 — 두 사람이 같은 줄을 누르면 늦은 쪽은 0건이다 */
export async function resolveIssue(db: Db, id: string, status: Exclude<DataIssueStatus, "open">, source: AuditSource, userId: string): Promise<boolean> {
  const done = await db
    .update(dataIssues)
    .set({ status, resolvedAt: new Date(), ...updatedBy(source, userId) })
    .where(and(eq(dataIssues.id, id), eq(dataIssues.status, "open")))
    .returning({ id: dataIssues.id });
  return done.length > 0;
}

export async function findIssuesByIds(db: Db, ids: string[]) {
  if (ids.length === 0) return [];
  return db.select().from(dataIssues).where(inArray(dataIssues.id, ids));
}
