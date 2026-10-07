// 스토어 수집 경로 — 단건 조회와 배치 조회. 어느 쪽이든 항목 하나의 실패가 실행 전체를 멈추지 않는다.
import type { StoreAdapter, StoreSnapshot } from "@/server/adapters/types";
import type { StoreSource } from "@/server/adapters";
import { sleep } from "@/lib/async";
import { errorMessage } from "@/lib/errors";
import { applyMissingRefs } from "./missing-refs";
import { DEFAULT_FETCH_BATCH_SIZE, SOURCE_PLATFORMS, SOURCE_REGION } from "./constants";
import { recordError, type Ctx } from "./context";
import { fetchWithRetry } from "./retry";
import { markPlatformFailed } from "./platform-writer";
import type { StoreTarget } from "./store-targets";

export type Fetched = Array<{ target: StoreTarget; snapshot: StoreSnapshot }>;

/** 단건 조회 경로 — fetchMany 를 지원하지 않는 소스(xbox/nintendo/psstore)용 */
export async function fetchStoreOneByOne(ctx: Ctx, source: StoreSource, adapter: StoreAdapter, targets: StoreTarget[]): Promise<Fetched> {
  const fetched: Fetched = [];
  for (let i = 0; i < targets.length; i++) {
    const target = targets[i];
    try {
      fetched.push({ target, snapshot: await fetchWithRetry(() => adapter.fetch(target.externalId)) });
    } catch (e) {
      recordError(ctx, `${source}:${target.externalId}`, e);
      if (target.gameId) await markPlatformFailed(ctx, target.gameId, SOURCE_PLATFORMS[source], SOURCE_REGION[source]);
    }
    if (i < targets.length - 1) await sleep(adapter.minIntervalMs);
  }
  return fetched;
}

/**
 * 배치 조회 경로 (steam). 한 요청에 batchSize 개씩 묶는다.
 * 배치 하나가 통째로 실패하면 그 배치만 단건 조회로 되돌린다 — 카탈로그 전체가 한 번의 실패로 멈추지 않게.
 */
export async function fetchStoreBatched(ctx: Ctx, source: StoreSource, adapter: StoreAdapter, targets: StoreTarget[]): Promise<Fetched> {
  const size = adapter.batchSize ?? DEFAULT_FETCH_BATCH_SIZE;
  /** 배치가 성공했는데 응답에 없던 id. 회차 끝에 한 번에 세어 둔다(왕복을 건마다 쓰지 않는다) */
  const missing: string[] = [];

  // 배치가 가격만 주는 소스(nintendo)는 신규 등록 대상을 단건 상세로 따로 받는다 —
  // 제목, 이미지가 없으면 게임을 만들 수 없다. 발견 목록이 상세까지 준 소스(nintendo_jp)는 그럴 필요가 없다.
  // 기존 게임이어도 상세를 달라고 표시한 대상(needsDetail: 발견이 흡수한 것, 상세 몫)은 같은 길로 보낸다.
  const fetched: Fetched = [];
  let batchable = targets;
  if (adapter.batchPricesOnly === "detail") {
    const wantsDetail = (t: StoreTarget) => !t.gameId || t.needsDetail === true;
    const needDetail = targets.filter(wantsDetail);
    batchable = targets.filter((t) => !wantsDetail(t));
    if (needDetail.length > 0) {
      console.log(`[sync:${source}] ${needDetail.length}건은 상세 조회로 받는다 (배치는 가격만 준다)`);
      fetched.push(...(await fetchStoreOneByOne(ctx, source, adapter, needDetail)));
    }
  }

  const batches: StoreTarget[][] = [];
  for (let i = 0; i < batchable.length; i += size) batches.push(batchable.slice(i, i + size));

  for (let b = 0; b < batches.length; b++) {
    const batch = batches[b];
    let byId: Map<string, StoreSnapshot>;
    try {
      byId = await fetchWithRetry(() => adapter.fetchMany!(batch.map((t) => t.externalId)));
    } catch (e) {
      // 단건 조회 경로가 없는 소스(nintendo_jp)는 폴백할 곳이 없다 — 배치 실패를 그대로 기록하고 넘어간다
      if (adapter.batchPricesOnly === "discovery") {
        recordError(ctx, `${source}:batch`, e);
        console.warn(`[sync:${source}] 배치 ${b + 1}/${batches.length} 실패 (단건 경로 없음): ${errorMessage(e)}`);
        continue;
      }
      console.warn(`[sync:${source}] 배치 ${b + 1}/${batches.length} 실패 → 단건 조회로 폴백: ${errorMessage(e)}`);
      fetched.push(...(await fetchStoreOneByOne(ctx, source, adapter, batch)));
      continue;
    }
    for (const target of batch) {
      const snapshot = byId.get(target.externalId);
      if (snapshot) {
        // 가격만 주는 응답은 기기(switch/switch2)를 모른다. 아는 값이 있으면 그것으로 바로잡는다 —
        // 안 그러면 Switch 2 행 옆에 Switch 행이 새로 생긴다
        fetched.push({
          target,
          snapshot: adapter.batchPricesOnly && target.platform ? { ...snapshot, platform: target.platform } : snapshot,
        });
        continue;
      }
      // 배치는 성공했는데 이 id 만 빠진 경우 = 삭제/비공개/지역 미판매. 재시도해도 같으니 폴백하지 않는다
      recordError(ctx, `${source}:${target.externalId}`, new Error("배치 응답에 없음 (비공개, 미판매, 삭제 추정)"));
      missing.push(target.externalId);
      // game_platforms 행이 **아예 없는** ref 가 있다(제목 역매칭으로 붙었지만 그 나라에 없는 상품).
      // 그때 이 호출은 고칠 행이 없어 아무 일도 안 한다 — 그래서 아래 missing 집계가 따로 필요하다
      if (target.gameId) await markPlatformFailed(ctx, target.gameId, SOURCE_PLATFORMS[source], SOURCE_REGION[source]);
    }
    if (b < batches.length - 1) await sleep(adapter.minIntervalMs);
  }

  /**
   * 안 준 id 는 세어 두고 준 id 는 되돌린다(sync/missing-refs). 한계를 넘으면 다음 회차부터
   * 대상에서 빠지고, MISSING_RETRY_DAYS 가 지나면 한 번 다시 물어본다.
   * 여기서 실패해도 수집을 멈추지 않는다 — 기록이 못 남으면 예전처럼 매번 묻게 될 뿐이다.
   */
  try {
    const { bumped, cleared } = await applyMissingRefs(
      ctx.db,
      source,
      fetched.map((f) => f.target.externalId),
      missing,
      ctx.now,
    );
    if (bumped > 0 || cleared > 0) {
      console.log(`[sync:${source}] 스토어가 안 준 ref ${bumped}건 누적, 되살아난 ref ${cleared}건 초기화`);
    }
  } catch (e) {
    console.warn(`[sync:${source}] 안 준 ref 기록 실패: ${errorMessage(e)}`);
  }
  return fetched;
}
