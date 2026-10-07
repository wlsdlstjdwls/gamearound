// 스토어 소스 실행 — 수집 → 검증 → 반영 3단계. 검증을 통과하지 못하면 아무것도 반영하지 않는다.
import { getStoreAdapter, type StoreSource } from "@/server/adapters";
import { BATCH_SIZE } from "./constants";
import { isoDay, judgePrices } from "./price-guard";
import { recordError, type Ctx, type RunOptions } from "./context";
import { listParentDlcs } from "./dlc-list";
import { syncPatchNotes } from "./patch-list";
import { syncRequirements } from "./requirements";
import { syncDlcs } from "./dlc-writer";
import { applyStore } from "./store-apply";
import { fetchStoreBatched, fetchStoreOneByOne } from "./store-fetch";
import { listStoreTargets } from "./store-targets";
import { syncPopularityRanks } from "./rank-writer";

export async function runStore(ctx: Ctx, source: StoreSource, opts: RunOptions): Promise<void> {
  const adapter = getStoreAdapter(source);

  // 0단계: 인기순위 순번. 발견을 도는 실행에서만 돈다 —
  // Actions 의 가격 갱신(seedTop 없음)에 30초를 얹지 않기 위해서다. 순위는 하루에 몇 번씩
  // 다시 읽을 값이 아니고, 발견이 도는 주기면 POPULARITY_RANK_MAX_AGE_DAYS 안에 충분히 들어온다.
  if (opts.seedTop) {
    const ranked = await syncPopularityRanks(ctx, source, adapter);
    if (ranked > 0) console.log(`[sync:${source}] 인기순위 ${ranked}건 기록`);
  }

  const targets = await listStoreTargets(ctx, source, {
    limit: opts.limit ?? BATCH_SIZE[source],
    seedTop: opts.seedTop,
    pageBudget: opts.pageBudget,
    seedShare: opts.seedShare,
    detailTop: opts.detailTop,
  });
  console.log(`[sync:${source}] 대상 ${targets.length}건 (신규 시드 ${targets.filter((t) => t.gameId === null).length})`);

  // 1단계: 수집 (검증을 위해 반영 전에 전부 모은다)
  const fetched = adapter.fetchMany
    ? await fetchStoreBatched(ctx, source, adapter, targets)
    : await fetchStoreOneByOne(ctx, source, adapter, targets);

  // 2단계: §10 파싱 검증 — 값이 있어야 할 항목에서 가격을 못 읽는 일이 잦으면 반영 생략(sync/price-guard)
  const verdict = judgePrices(fetched.map((f) => f.snapshot), isoDay(ctx.now));
  if (verdict.blocked) {
    const msg = `가격 검증 실패: 값이 있어야 할 ${verdict.expected}건 중 ${verdict.unreadable}건을 못 읽음 — 반영 생략 (마크업/응답 변경 의심)`;
    ctx.errors.unshift(msg);
    ctx.failed += fetched.length;
    console.warn(`[sync:${source}] ${msg}`);
    return;
  }
  // 모수에서 빠진 수를 남긴다 — 이 수가 배치를 거의 다 먹으면 가드가 사실상 꺼져 있다는 뜻이다.
  // 2026-09-17 사고가 그 반대(빠졌어야 할 것이 모수에 있었다)라 양쪽 다 보이게 적는다.
  if (verdict.skipped > 0) {
    console.log(`[sync:${source}] 가격 검증 모수 ${verdict.expected}건 (미출시, 출시일 미상 ${verdict.skipped}건 제외)`);
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

  // 5단계: 사양. 사양을 주는 스토어(steam)에서만 돈다 — 콘솔은 사양이라는 개념이 없어
  // 어댑터에 메서드가 없고 즉시 빠진다. 백필은 여기가 아니라 로컬 스크립트가 맡는다(REQUIREMENTS_PER_RUN).
  try {
    const specs = await syncRequirements(ctx, source, adapter, applied);
    if (specs > 0) console.log(`[sync:${source}] 사양 ${specs}건 반영`);
  } catch (e) {
    recordError(ctx, `${source}:requirements`, e);
  }

  // 6단계: 패치 기록. 공개하는 스토어(steam)에서만 돈다 — 나머지는 어댑터에 메서드가 없어 즉시 빠진다.
  // DLC 와 마찬가지로 실패해도 가격 수집 결과는 유지한다.
  try {
    const notes = await syncPatchNotes(ctx, source, adapter, applied);
    if (notes > 0) console.log(`[sync:${source}] 패치 기록 ${notes}건 신규`);
  } catch (e) {
    recordError(ctx, `${source}:patch`, e);
  }
}
