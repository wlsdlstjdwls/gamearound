// 성능 표지 채우기 — Xbox 행은 카탈로그 속성, Steam 행은 PCGamingWiki(2026-11-16, 규칙은 lib/games/perf, 가져오기는 adapters/perf).
//
// 가격 회차와 따로 도는 이유: 성능 표지는 거의 안 바뀌고(출시 뒤 패치로 120fps 가 붙는 정도), PCGamingWiki 는 게임마다 요청 둘이라
// 가격 회차에 끼우면 그 회차가 느려진다. 그래서 물어본 지 PERF_RECHECK_DAYS 가 지난 행만, 회차마다 몫만큼 돈다.
// 인기 있는 게임부터 묻는다(목록 집계표의 인기 순번) — 화면에서 먼저 보이는 게임이 먼저 채워진다.
//
// 숨긴 스토어(Epic)와 지역(일본)은 묻지 않는다(AGENTS 5장). 한 항목의 실패는 회차를 멈추지 않는다(AGENTS 7장).
import { and, eq, inArray, isNull, lt, or, sql } from "drizzle-orm";
import { getDb } from "@/server/db/client";
import { gameListStats, gamePlatforms, HOME_REGION } from "@/server/db/schema";
import { fetchPcgwPerf, fetchXboxPerf, XBOX_PERF_BATCH } from "@/server/adapters/perf";
import { normalizePerf } from "@/lib/games/perf";
import { sleep } from "@/lib/async";
import { errorMessage } from "@/lib/errors";

/** 다시 물어보는 주기(일). 표지는 패치로 드물게 바뀐다 */
export const PERF_RECHECK_DAYS = 30;
/** 회차 몫 — Xbox 는 요청 하나에 20건이라 넉넉히, PCGamingWiki 는 게임마다 요청 둘이라 작게 */
export const PERF_XBOX_LIMIT = 400;
export const PERF_PCGW_LIMIT = 60;
/** PCGamingWiki 요청 사이 간격(ms) — 공개 위키라 한 줄로 천천히 묻는다 */
export const PCGW_INTERVAL_MS = 1200;

type Row = { id: string; externalId: string };

async function dueRows(platform: "xbox" | "steam", limit: number): Promise<Row[]> {
  const db = getDb();
  const rows = await db
    .select({ id: gamePlatforms.id, externalId: gamePlatforms.storeExternalId })
    .from(gamePlatforms)
    .leftJoin(gameListStats, eq(gameListStats.gameId, gamePlatforms.gameId))
    .where(
      and(
        eq(gamePlatforms.platform, platform),
        eq(gamePlatforms.region, HOME_REGION),
        sql`${gamePlatforms.storeExternalId} is not null and ${gamePlatforms.storeExternalId} <> ''`,
        or(isNull(gamePlatforms.perfCheckedAt), lt(gamePlatforms.perfCheckedAt, sql`now() - make_interval(days => ${PERF_RECHECK_DAYS})`)),
      ),
    )
    .orderBy(sql`${gameListStats.minRank} asc nulls last`, gamePlatforms.id)
    .limit(limit);
  return rows.filter((r): r is Row => Boolean(r.externalId));
}

async function save(ids: string[], features: string[] | null): Promise<void> {
  if (ids.length === 0) return;
  // 모르면(null) 표지는 그대로 두고 물어본 시각만 남긴다 — 다음 주기에 다시 묻는다
  const set = features === null ? { perfCheckedAt: new Date() } : { perfFeatures: normalizePerf(features), perfCheckedAt: new Date() };
  await getDb().update(gamePlatforms).set(set).where(inArray(gamePlatforms.id, ids));
}

export type PerfRunResult = { xbox: number; steam: number; failed: number };

export async function collectPerfFeatures(opts: { xboxLimit?: number; pcgwLimit?: number } = {}): Promise<PerfRunResult> {
  const result: PerfRunResult = { xbox: 0, steam: 0, failed: 0 };

  const xboxRows = await dueRows("xbox", opts.xboxLimit ?? PERF_XBOX_LIMIT);
  for (let i = 0; i < xboxRows.length; i += XBOX_PERF_BATCH) {
    const chunk = xboxRows.slice(i, i + XBOX_PERF_BATCH);
    try {
      const got = await fetchXboxPerf(chunk.map((r) => r.externalId));
      for (const r of chunk) {
        await save([r.id], got.get(r.externalId) ?? null);
        if (got.has(r.externalId)) result.xbox++;
      }
    } catch (e) {
      result.failed += chunk.length;
      console.error(`[perf] xbox ${i}: ${errorMessage(e)}`);
    }
  }

  const steamRows = await dueRows("steam", opts.pcgwLimit ?? PERF_PCGW_LIMIT);
  for (const r of steamRows) {
    try {
      const got = await fetchPcgwPerf(r.externalId);
      await save([r.id], got);
      if (got) result.steam++;
    } catch (e) {
      result.failed++;
      console.error(`[perf] pcgw ${r.externalId}: ${errorMessage(e)}`);
    }
    await sleep(PCGW_INTERVAL_MS);
  }
  return result;
}
