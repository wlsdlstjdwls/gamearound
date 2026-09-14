// 스토어 소스 실행 — 수집 → 검증 → 반영 3단계. 검증을 통과하지 못하면 아무것도 반영하지 않는다.
import { getStoreAdapter, type StoreSource } from "@/server/adapters";
import { BATCH_SIZE, SUSPICIOUS_MIN_SAMPLE, SUSPICIOUS_PRICE_RATIO } from "./constants";
import { recordError, type Ctx, type RunOptions } from "./context";
import { createGameFromSnapshot, updateGameMeta } from "./game-writer";
import { upsertPlatform } from "./platform-writer";
import { fetchStoreBatched, fetchStoreOneByOne } from "./store-fetch";
import { listStoreTargets } from "./store-targets";

export async function runStore(ctx: Ctx, source: StoreSource, opts: RunOptions): Promise<void> {
  const adapter = getStoreAdapter(source);
  const targets = await listStoreTargets(ctx, source, opts.limit ?? BATCH_SIZE[source], opts.seedTop);
  console.log(`[sync:${source}] 대상 ${targets.length}건 (신규 시드 ${targets.filter((t) => t.gameId === null).length})`);

  // 1단계: 수집 (검증을 위해 반영 전에 전부 모은다)
  const fetched = adapter.fetchMany
    ? await fetchStoreBatched(ctx, source, adapter, targets)
    : await fetchStoreOneByOne(ctx, source, adapter, targets);

  // 2단계: §10 파싱 검증 — 가격 0/null 급증 시 반영 생략
  const suspicious = fetched.filter((f) => f.snapshot.currentPrice === null || f.snapshot.currentPrice === 0).length;
  if (fetched.length >= SUSPICIOUS_MIN_SAMPLE && suspicious / fetched.length > SUSPICIOUS_PRICE_RATIO) {
    const msg = `가격 검증 실패: ${fetched.length}건 중 ${suspicious}건이 0원/null — 반영 생략 (마크업/응답 변경 의심)`;
    ctx.errors.unshift(msg);
    ctx.failed += fetched.length;
    console.warn(`[sync:${source}] ${msg}`);
    return;
  }

  // 3단계: 반영
  for (const { target, snapshot } of fetched) {
    try {
      let gameId = target.gameId;
      let slug = target.slug;
      if (!gameId || !slug) {
        const created = await createGameFromSnapshot(ctx, snapshot);
        gameId = created.id;
        slug = created.slug;
        ctx.changedSlugs.add(slug);
      } else if (source === "steam" && snapshot.meta) {
        await updateGameMeta(ctx, gameId, slug, snapshot.meta);
      }
      await upsertPlatform(ctx, gameId, slug, snapshot);
      ctx.processed++;
    } catch (e) {
      recordError(ctx, `${source}:${target.externalId}:db`, e);
    }
  }
}
