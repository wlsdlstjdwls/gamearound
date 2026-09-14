// 소스 1개 동기화 진입점 — 설계서 §4.4 흐름 8단계.
//  1. Redis 락  2. sync_logs INSERT  3~4. 소스별 실행(run-store / run-meta / run-news)
//  5. 가격 변동 → dispatch-alerts  6. sync_logs UPDATE  7. revalidate  8. 락 해제
// 이 파일은 순서와 실패 처리만 책임진다 — 실제 수집, 반영은 각 모듈이 한다.
import { eq } from "drizzle-orm";
import { getDb } from "@/server/db/client";
import { syncLogs, type SyncStatus } from "@/server/db/schema";
import { acquireLock, releaseLock } from "@/server/redis";
import { isCompanySource, isMetaSource, isNewsSource, isStoreSource, isSubscriptionSource } from "@/server/adapters";
import type { Source } from "@/server/adapters/types";
import { errorMessage } from "@/lib/errors";
import { LOCK_TTL_SEC } from "./constants";
import { loadLockedFields, recordError, type Ctx, type RunOptions, type RunResult } from "./context";
import { dispatchPriceAlerts, type DispatchSummary } from "./dispatch-alerts";
import { revalidateGameTags } from "./revalidate";
import { runMeta } from "./run-meta";
import { runNews } from "./run-news";
import { runStore } from "./run-store";
import { runCompanies } from "./run-companies";
import { runSubscriptions } from "./run-subscriptions";

export type { RunOptions, RunResult } from "./context";

export async function runSource(source: Source, opts: RunOptions = {}): Promise<RunResult> {
  const lockKey = `lock:${source}`;
  if (!(await acquireLock(lockKey, LOCK_TTL_SEC))) {
    console.log(`[sync:${source}] 이미 실행 중 (락 존재) — 종료`);
    return { source, status: "skipped", processed: 0, failed: 0, changed: 0 };
  }

  const db = getDb();
  const now = new Date();
  let logId: number | null = null;
  try {
    const [log] = await db.insert(syncLogs).values({ source, status: "ok", startedAt: now }).returning({ id: syncLogs.id });
    logId = log.id;

    const ctx: Ctx = {
      db, source, now,
      locks: await loadLockedFields(db),
      processed: 0, failed: 0, errors: [],
      changedSlugs: new Set(), changedCompanySlugs: new Set(), priceChanges: [],
    };

    if (isStoreSource(source)) await runStore(ctx, source, opts);
    else if (isMetaSource(source)) await runMeta(ctx, source, opts);
    else if (isCompanySource(source)) await runCompanies(ctx, source, opts);
    else if (isSubscriptionSource(source)) await runSubscriptions(ctx, source);
    else if (isNewsSource(source)) await runNews(ctx);

    // 5. 알림 (§7) — 실패해도 동기화 결과는 유지
    let alerts: DispatchSummary | undefined;
    if (ctx.priceChanges.length > 0) {
      try {
        alerts = await dispatchPriceAlerts(ctx.priceChanges);
        console.log(`[sync:${source}] 알림: ${JSON.stringify(alerts)}`);
      } catch (e) {
        recordError(ctx, "alerts", e);
      }
    }

    // 7. 캐시 무효화 — 실패는 partial 사유로만 기록
    try {
      await revalidateGameTags(Array.from(ctx.changedSlugs), Array.from(ctx.changedCompanySlugs));
    } catch (e) {
      recordError(ctx, "revalidate", e);
    }

    const status: SyncStatus = ctx.failed === 0 ? "ok" : ctx.processed === 0 ? "failed" : "partial";
    const errorSample = ctx.errors.length ? ctx.errors.join("\n").slice(0, 1000) : null;
    await db
      .update(syncLogs)
      .set({ status, processed: ctx.processed, failed: ctx.failed, errorSample, finishedAt: new Date() })
      .where(eq(syncLogs.id, logId));

    return { source, status, processed: ctx.processed, failed: ctx.failed, changed: ctx.changedSlugs.size, errorSample: errorSample ?? undefined, alerts };
  } catch (e) {
    const message = errorMessage(e);
    console.error(`[sync:${source}] 치명적 오류: ${message}`);
    if (logId !== null) {
      await db
        .update(syncLogs)
        .set({ status: "failed", errorSample: message.slice(0, 1000), finishedAt: new Date() })
        .where(eq(syncLogs.id, logId))
        .catch(() => undefined);
    }
    return { source, status: "failed", processed: 0, failed: 0, changed: 0, errorSample: message };
  } finally {
    await releaseLock(lockKey).catch((e) => console.warn(`[sync:${source}] 락 해제 실패: ${errorMessage(e)}`));
  }
}
