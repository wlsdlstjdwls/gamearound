// 스토어 소스 실행 — 수집 → 검증 → 반영 3단계. 검증을 통과하지 못하면 아무것도 반영하지 않는다.
import { getStoreAdapter, type StoreSource } from "@/server/adapters";
import { BATCH_SIZE, SUSPICIOUS_MIN_SAMPLE, SUSPICIOUS_PRICE_RATIO } from "./constants";
import { recordError, type Ctx, type RunOptions } from "./context";
import { listParentDlcs } from "./dlc-list";
import { syncDlcs } from "./dlc-writer";
import { applyStore } from "./store-apply";
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

  // 3단계: 반영 — 읽기와 쓰기를 각각 묶어 보낸다(store-apply)
  const applied = await applyStore(ctx, source, fetched);

  // 4단계: 본편이 알려준 새 DLC 등록. 실패해도 가격 수집 결과는 유지한다.
  // 배치 조회가 DLC 목록을 주지 않는 소스(steam)는 목록을 따로 물어본 뒤 같은 등록 경로로 보낸다
  try {
    const listed = await listParentDlcs(ctx, source, adapter, applied);
    const created = await syncDlcs(ctx, source, adapter, applied, listed);
    if (created > 0) console.log(`[sync:${source}] DLC ${created}건 신규 등록`);
  } catch (e) {
    recordError(ctx, `${source}:dlc`, e);
  }
}
