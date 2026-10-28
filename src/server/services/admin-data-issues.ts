// 관리자 "데이터 점검" 화면의 읽기와 판정(sync/quality 가 쌓은 줄). 고침 자체는 sync/quality 의 적용기가 한다 —
// 크론이 자동으로 고칠 때와 사람이 누를 때 같은 함수를 지나야 잠금, 낡은 판정 가드가 한 벌로 남는다.
import "server-only";
import { and, count, desc, eq, inArray } from "drizzle-orm";
import { getDb } from "@/server/db/client";
import { dataIssues, games } from "@/server/db/schema";
import { requireAdmin } from "@/server/services/users";
import { applyQualityFix, findIssuesByIds, resolveIssue, StaleFixError, type QualityFix } from "@/server/sync/quality";

/** 최근 자동 고침 기록을 몇 줄 보여 줄지. 기계가 무엇을 고쳤는지 훑어보는 자리라 많을 필요가 없다 */
const RECENT_AUTO_LIMIT = 20;

export interface DataIssueRow {
  id: string;
  rule: string;
  verdict: string;
  reason: string;
  /** 고칠 안이 있는가. 없으면(스토어 확인) 화면은 "확인했어요" 만 세운다 */
  fixable: boolean;
  game: { slug: string; title: string } | null;
  createdAt: string;
}

export interface DataIssueList {
  open: DataIssueRow[];
  recentAuto: DataIssueRow[];
}

function toRow(r: {
  id: string;
  rule: string;
  verdict: string;
  reason: string;
  fix: unknown;
  slug: string | null;
  titleKo: string | null;
  titleEn: string | null;
  createdAt: Date;
}): DataIssueRow {
  return {
    id: r.id,
    rule: r.rule,
    verdict: r.verdict,
    reason: r.reason,
    fixable: r.fix !== null,
    game: r.slug ? { slug: r.slug, title: r.titleKo ?? r.titleEn ?? r.slug } : null,
    createdAt: r.createdAt.toISOString(),
  };
}

export async function listDataIssues(): Promise<DataIssueList> {
  await requireAdmin();
  const db = getDb();
  const cols = {
    id: dataIssues.id,
    rule: dataIssues.rule,
    verdict: dataIssues.verdict,
    reason: dataIssues.reason,
    fix: dataIssues.fix,
    slug: games.slug,
    titleKo: games.titleKo,
    titleEn: games.titleEn,
    createdAt: dataIssues.createdAt,
  };
  // 두 질의를 한 묶음으로 — 줄 세우면 왕복이 쌓인다
  const [open, auto] = await Promise.all([
    db.select(cols).from(dataIssues).leftJoin(games, eq(games.id, dataIssues.gameId)).where(eq(dataIssues.status, "open")).orderBy(desc(dataIssues.createdAt)),
    db
      .select(cols)
      .from(dataIssues)
      .leftJoin(games, eq(games.id, dataIssues.gameId))
      .where(and(eq(dataIssues.status, "applied"), eq(dataIssues.verdict, "auto")))
      .orderBy(desc(dataIssues.updatedAt))
      .limit(RECENT_AUTO_LIMIT),
  ]);
  return { open: open.map(toRow), recentAuto: auto.map(toRow) };
}

/** 메뉴 배지 */
export async function countOpenDataIssues(): Promise<number> {
  const [row] = await getDb().select({ n: count() }).from(dataIssues).where(eq(dataIssues.status, "open"));
  return row?.n ?? 0;
}

export type DataIssueDecision = "apply" | "dismiss";
export type DataIssueOutcome = { ok: true; slugs: string[] } | { ok: false; reason: "stale" | "gone" };

/** 관리자 판정 하나. 적용은 고침을 넣고 그 칸을 관리자 이름으로 잠근다 */
export async function decideDataIssue(id: string, decision: DataIssueDecision): Promise<DataIssueOutcome> {
  const admin = await requireAdmin();
  const db = getDb();
  const [issue] = await findIssuesByIds(db, [id]);
  if (!issue || issue.status !== "open") return { ok: false, reason: "gone" };
  if (decision === "dismiss" || issue.fix === null) {
    return (await resolveIssue(db, id, "dismissed", "admin", admin.id)) ? { ok: true, slugs: [] } : { ok: false, reason: "gone" };
  }
  let touched: string[];
  try {
    touched = await applyQualityFix(db, issue.fix as QualityFix, { source: "admin", adminUserId: admin.id });
  } catch (e) {
    if (e instanceof StaleFixError) return { ok: false, reason: "stale" };
    throw e;
  }
  await resolveIssue(db, id, "applied", "admin", admin.id);
  const slugs = touched.length > 0 ? await db.select({ slug: games.slug }).from(games).where(inArray(games.id, touched)) : [];
  return { ok: true, slugs: slugs.map((s) => s.slug) };
}
