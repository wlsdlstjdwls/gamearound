// 세로 아트 한 번 채우기 — pnpm portraits:backfill [--source=xbox] [--limit=N] [--dry]
//
// 왜 스크립트가 따로 있나: 세로 아트는 이미 정규 수집이 채운다(sync/game-writer 의 planGameMeta).
// 다만 그 경로는 **가격 갱신 차례가 온 게임**만 건드린다. Xbox 는 하루 1회 × 200건이라
// 카탈로그 한 바퀴에 두 달이 걸리고(.github/workflows/crawl-prices.yml 의 예산 주석),
// 그동안 빈 세로 자리는 그대로 남는다. 이 스크립트는 그 자리만 골라 한 번에 메운다.
//
// 가격을 쓰지 않는다. 읽는 것은 같은 응답이지만 반영하는 것은 games 의 이미지 두 칸뿐이라,
// 정규 수집과 같이 돌아도 가격 이력이 흔들리지 않는다. 잠긴 필드와 덮어쓰기 규칙은
// planGameMeta 를 그대로 불러 지킨다 — 규칙이 두 벌이 되면 한쪽만 고쳐진다.
import path from "node:path";
import { config as loadEnv } from "dotenv";
import { and, eq, inArray, isNull, sql } from "drizzle-orm";
import { getDb } from "@/server/db/client";
import { gameSourceRefs, games } from "@/server/db/schema";
import { getStoreAdapter, type StoreSource } from "@/server/adapters";
import { createContext, recordError } from "@/server/sync/context";
import { planGameMeta, type GameRow } from "@/server/sync/game-writer";
import { runStatements } from "@/server/sync/store-apply";
import { MATCHED_FOR_SYNC, PORTRAIT_SOURCES } from "@/server/sync/constants";
import { revalidateGameTags } from "@/server/sync/revalidate";
import { sleep } from "@/lib/async";
import { errorMessage } from "@/lib/errors";

loadEnv({ path: path.resolve(process.cwd(), ".env.local"), quiet: true });
loadEnv({ quiet: true });

/** 배치 조회가 없는 소스를 단건으로 돌 때의 한 묶음 크기. 실패 격리 단위이기도 하다 */
const SINGLE_CHUNK = 20;

function parseArg(argv: string[], name: string): string | undefined {
  return argv.find((a) => a.startsWith(`--${name}=`))?.split("=")[1];
}

/** 세로가 빈 게임 중 이 소스로 다시 물을 수 있는 것. matched_by='none' 은 "찾아봤지만 없더라" 표식이라 뺀다 */
async function targetsOf(source: StoreSource, limit: number) {
  const db = getDb();
  return db
    .select({ gameId: games.id, slug: games.slug, externalId: gameSourceRefs.externalId })
    .from(games)
    .innerJoin(gameSourceRefs, eq(gameSourceRefs.gameId, games.id))
    .where(
      and(
        isNull(games.portraitUrl),
        eq(gameSourceRefs.source, source),
        inArray(gameSourceRefs.matchedBy, MATCHED_FOR_SYNC),
        sql`${gameSourceRefs.externalId} <> ''`,
      ),
    )
    .limit(limit);
}

async function runSource(source: StoreSource, limit: number, dry: boolean): Promise<number> {
  const targets = await targetsOf(source, limit);
  if (targets.length === 0) {
    console.log(`[portraits:${source}] 대상 없음`);
    return 0;
  }
  const adapter = getStoreAdapter(source);
  const ctx = await createContext(source);
  const db = ctx.db;
  const size = adapter.fetchMany ? adapter.batchSize ?? SINGLE_CHUNK : SINGLE_CHUNK;
  console.log(`[portraits:${source}] 대상 ${targets.length}건, 묶음 ${size}`);

  let filled = 0;
  const started = Date.now();
  for (let i = 0; i < targets.length; i += size) {
    const chunk = targets.slice(i, i + size);
    const byId = new Map(chunk.map((t) => [t.externalId, t]));
    let snapshots: Map<string, Awaited<ReturnType<typeof adapter.fetch>>>;
    try {
      if (adapter.fetchMany) {
        snapshots = await adapter.fetchMany(chunk.map((t) => t.externalId));
      } else {
        snapshots = new Map();
        for (const t of chunk) {
          try {
            snapshots.set(t.externalId, await adapter.fetch(t.externalId));
          } catch (e) {
            recordError(ctx, `portrait:${t.slug}`, e);
          }
          await sleep(adapter.minIntervalMs);
        }
      }
    } catch (e) {
      // 묶음 하나가 통째로 깨져도 다음 묶음은 계속 간다 (§7)
      recordError(ctx, `portrait:batch:${i}`, e);
      continue;
    }

    // 현재 행을 읽어야 planGameMeta 가 "이미 있는 값" 을 판단한다
    const ids = chunk.map((t) => t.gameId);
    const rows = await db.select().from(games).where(inArray(games.id, ids));
    const cur = new Map<string, GameRow>(rows.map((r) => [r.id, r]));

    const updates = [];
    for (const [externalId, snapshot] of snapshots) {
      const t = byId.get(externalId);
      const row = t && cur.get(t.gameId);
      if (!t || !row || !snapshot.meta) continue;
      const set = planGameMeta(ctx, row, snapshot.meta);
      // 이 스크립트가 반영하는 것은 이미지 두 칸뿐이다. 제목, 설명, 회사는 정규 수집의 몫으로 남긴다 —
      // 여기서 같이 고치면 "가격 없이 마스터만 바꾸는" 두 번째 경로가 생기고, 어느 쪽이 바꿨는지 못 가린다.
      const media: Partial<typeof games.$inferInsert> = {};
      if (set.portraitUrl) media.portraitUrl = set.portraitUrl;
      if (set.coverUrl) media.coverUrl = set.coverUrl;
      if (Object.keys(media).length === 0) continue;
      updates.push({ gameId: t.gameId, slug: t.slug, media });
    }

    if (!dry && updates.length > 0) {
      await runStatements(
        ctx,
        "portrait",
        updates.map((u) => db.update(games).set({ ...u.media, updatedAt: ctx.now }).where(eq(games.id, u.gameId))),
      );
    }
    for (const u of updates) ctx.changedSlugs.add(u.slug);
    filled += updates.length;
    console.log(
      `[portraits:${source}] ${Math.min(i + size, targets.length)}/${targets.length} | 채움 ${filled} | ${((Date.now() - started) / 1000).toFixed(0)}s`,
    );
    if (adapter.fetchMany) await sleep(adapter.minIntervalMs);
  }

  if (!dry && ctx.changedSlugs.size > 0) {
    try {
      await revalidateGameTags(Array.from(ctx.changedSlugs));
    } catch (e) {
      console.warn(`[portraits:${source}] 캐시 무효화 실패(값은 들어갔다): ${errorMessage(e)}`);
    }
  }
  if (ctx.errors.length > 0) console.warn(`[portraits:${source}] 오류 표본: ${ctx.errors.slice(0, 3).join(" | ")}`);
  return filled;
}

async function main(): Promise<number> {
  const argv = process.argv.slice(2);
  const only = parseArg(argv, "source") as StoreSource | undefined;
  const limit = Number(parseArg(argv, "limit") ?? 0) || Number.MAX_SAFE_INTEGER;
  const dry = argv.includes("--dry");
  const sources = only ? [only] : PORTRAIT_SOURCES;
  if (only && !PORTRAIT_SOURCES.includes(only)) {
    console.error(`[portraits] ${only} 는 세로 아트를 주지 않는다 (PORTRAIT_SOURCES 주석)`);
    return 1;
  }
  let total = 0;
  for (const s of sources) total += await runSource(s, limit, dry);
  console.log(`[portraits] 끝. 채운 게임 ${total}건${dry ? " (dry, 쓰지 않음)" : ""}`);
  return 0;
}

main().then(
  (code) => process.exit(code),
  (e) => {
    console.error(errorMessage(e));
    process.exit(1);
  },
);
