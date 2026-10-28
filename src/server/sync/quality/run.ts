// 데이터 점검기 한 회차 — 읽고(load), 판정하고(rules), 확실한 것은 고치고(apply), 나머지는 관리자 줄로 남긴다(issues).
// 하루 크론(/api/cron/daily, UTC 18시)이 부른다. 수집 창 안이라 DB 를 따로 깨우지 않는다.
//
// 항목 하나의 실패가 회차를 멈추지 않는다(AGENTS §7). 실패한 auto 는 사람에게 넘긴다 — 기계가 못 고친 것을 버리면
// 문제가 조용히 남는다.
import "server-only";
import { getDb } from "@/server/db/client";
import { errorMessage } from "@/lib/errors";
import { escapeHtml } from "@/lib/html-entities";
import { ROUTES } from "@/lib/routes";
import { QUALITY_MESSAGES as M } from "@/lib/admin/messages";
import { sendAdminTelegram, telegramConfigured } from "@/server/telegram/send";
import { ERROR_SAMPLE_MAX, QUALITY_AUTO_FIX_MAX, QUALITY_NOTICE_SAMPLE_MAX, QUALITY_SOURCE } from "../constants";
import { revalidateGameTags } from "../revalidate";
import { applyQualityFix, StaleFixError } from "./apply";
import { deleteOpenIssues, upsertIssues } from "./issues";
import { issueKey, loadQualityInput } from "./load";
import { findParentChains, findParentMoreSpecific, findReleaseDateGaps, findSharedStoreIds, type QualityFinding } from "./rules";

export interface QualityRunResult {
  found: number;
  autoApplied: number;
  /** 이번 회차에 처음 사람 줄에 오른 수 */
  newlyOpened: number;
  open: number;
  /** 판정 뒤 값이 바뀌어 버린 고침 */
  stale: number;
  vanished: number;
  failed: number;
  errors: string[];
}

export async function runDataQuality(now: Date = new Date()): Promise<QualityRunResult> {
  const db = getDb();
  const input = await loadQualityInput(db);
  const findings: QualityFinding[] = [
    ...findParentChains(input.games, input.lockedParent),
    ...findParentMoreSpecific(input.games, input.lockedParent, input.pricedGameIds),
    ...findReleaseDateGaps(input.platforms, now),
    ...findSharedStoreIds(input.shared),
  ];

  const result: QualityRunResult = { found: findings.length, autoApplied: 0, newlyOpened: 0, open: 0, stale: 0, vanished: 0, failed: 0, errors: [] };
  const touched = new Set<string>();
  const applied: QualityFinding[] = [];
  const toOpen: QualityFinding[] = [];
  const seen = new Set<string>();
  let budget = QUALITY_AUTO_FIX_MAX;

  for (const f of findings) {
    const key = issueKey(f.rule, f.subjectKey);
    if (seen.has(key)) continue;
    seen.add(key);
    const prev = input.issues.get(key);
    // 사람이 "아니에요" 로 넘긴 것은 다시 묻지 않는다
    if (prev?.status === "dismissed") continue;
    if (f.verdict === "auto" && f.fix && budget > 0) {
      budget--;
      try {
        for (const id of await applyQualityFix(db, f.fix, { source: QUALITY_SOURCE, adminUserId: null })) touched.add(id);
        applied.push(f);
        continue;
      } catch (e) {
        if (e instanceof StaleFixError) {
          result.stale++;
          continue;
        }
        result.failed++;
        if (result.errors.length < ERROR_SAMPLE_MAX) result.errors.push(`[${f.rule}:${f.subjectKey}] ${errorMessage(e)}`);
      }
    }
    toOpen.push(f);
    if (prev?.status !== "open") result.newlyOpened++;
  }

  await upsertIssues(db, applied.map((f) => ({ ...f, status: "applied" as const })), QUALITY_SOURCE);
  await upsertIssues(db, toOpen.map((f) => ({ ...f, status: "open" as const })), QUALITY_SOURCE);
  const vanishedIds = [...input.issues.entries()].filter(([key, v]) => v.status === "open" && !seen.has(key)).map(([, v]) => v.id);
  result.vanished = await deleteOpenIssues(db, vanishedIds);
  result.autoApplied = applied.length;
  result.open = toOpen.length;

  const slugs = [...touched].map((id) => input.slugOf.get(id)).filter((s): s is string => Boolean(s));
  try {
    await revalidateGameTags(slugs);
  } catch (e) {
    result.errors.push(`[revalidate] ${errorMessage(e)}`);
  }
  await notify(result, applied);
  return result;
}

/** 고친 것이나 새로 물을 것이 있을 때만 관리자 채널에 한 통. 아무 일 없는 날까지 보내면 아무도 안 읽는다 */
async function notify(r: QualityRunResult, applied: QualityFinding[]): Promise<void> {
  if (!telegramConfigured() || (r.autoApplied === 0 && r.newlyOpened === 0 && r.failed === 0)) return;
  const link = `${process.env.NEXT_PUBLIC_APP_URL ?? ""}${ROUTES.adminDataIssues}`;
  const lines = [
    `<b>${escapeHtml(M.noticeTitle)}</b>`,
    "",
    `${M.noticeAuto}  ${r.autoApplied}`,
    `${M.noticeNew}  ${r.newlyOpened}`,
    `${M.noticeOpen}  ${r.open}`,
    ...(r.failed > 0 ? [`${M.noticeFailed}  ${r.failed}`] : []),
    ...(applied.length > 0 ? ["", ...applied.slice(0, QUALITY_NOTICE_SAMPLE_MAX).map((f) => `<blockquote>${escapeHtml(f.reason)}</blockquote>`)] : []),
    "",
    `<a href="${escapeHtml(link)}">${escapeHtml(M.noticeOpenLink)}</a>`,
  ];
  try {
    await sendAdminTelegram(lines.join("\n"));
  } catch (e) {
    console.warn(`[quality] 알림 실패: ${errorMessage(e)}`);
  }
}
