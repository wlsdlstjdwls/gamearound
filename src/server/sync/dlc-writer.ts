// DLC 반영 — 기획서 F5.
//
// DLC 를 별도 테이블이 아니라 games 행으로 담는다(기획서 5.4). 그래서 이 파일이 하는 일은
// "본편이 알려준 DLC 중 아직 모르는 것을 게임 레코드로 만드는 것" 하나뿐이다.
// 한 번 만들어지면 그 DLC 는 자기 gameSourceRefs 를 갖게 되고, 다음 배치부터는
// 일반 게임과 똑같은 경로(listStoreTargets)로 가격이 갱신된다 — 여기서 다시 손대지 않는다.
//
// 상한(DLC_PER_GAME_MAX)을 두는 이유: DLC 가 수십 개인 타이틀 하나가 배치를 통째로 먹는다.
import { and, eq, inArray } from "drizzle-orm";
import { gameSourceRefs } from "@/server/db/schema";
import type { SearchCandidate, StoreAdapter, StoreSnapshot } from "@/server/adapters/types";
import type { StoreSource } from "@/server/adapters";
import { sleep } from "@/lib/async";
import { DEFAULT_FETCH_BATCH_SIZE, DLC_FETCH_PER_RUN_BY_SOURCE, DLC_PER_GAME_MAX } from "./constants";
import { recordError, type Ctx } from "./context";
import { createGameFromSnapshot } from "./game-writer";
import { upsertPlatform } from "./platform-writer";
import { fetchWithRetry } from "./retry";
import { withDiscoveredMedia } from "./store-apply";
import { candidateAsTarget } from "./store-targets";

/** 본편 1건과 그 본편이 알려준 DLC 외부 ID 들 */
export interface DlcGroup {
  parentGameId: string;
  parentSlug: string;
  externalIds: string[];
  /**
   * 목록 요청이 ID 와 함께 준 게임 마스터(nintendo_jp). 배치가 가격만 주고 DLC 상세를 되물을
   * 경로가 없는 소스에서는 이것이 없으면 제목도 이미지도 없는 게임이 생긴다.
   */
  candidates?: SearchCandidate[];
}

/**
 * 수집 결과에서 DLC 그룹을 뽑는다.
 * 본편만 본다 — DLC 가 또 DLC 를 가리키는 경우는 없고, 있더라도 따라가면 끝이 없다.
 */
export function collectDlcGroups(
  applied: Array<{ gameId: string; slug: string; snapshot: StoreSnapshot }>,
): DlcGroup[] {
  const out: DlcGroup[] = [];
  for (const { gameId, slug, snapshot } of applied) {
    if (snapshot.contentType === "dlc") continue;
    const ids = snapshot.dlcExternalIds ?? [];
    if (ids.length === 0) continue;
    out.push({ parentGameId: gameId, parentSlug: slug, externalIds: ids.slice(0, DLC_PER_GAME_MAX) });
  }
  return out;
}

/** 이 소스에 이미 등록된 외부 ID — 이미 아는 DLC 는 일반 경로가 갱신하므로 여기서 건너뛴다 */
async function knownExternalIds(ctx: Ctx, source: StoreSource, ids: string[]): Promise<Set<string>> {
  if (ids.length === 0) return new Set();
  const rows = await ctx.db
    .select({ externalId: gameSourceRefs.externalId })
    .from(gameSourceRefs)
    .where(and(eq(gameSourceRefs.source, source), inArray(gameSourceRefs.externalId, ids)));
  return new Set(rows.map((r) => r.externalId));
}

/**
 * 새 DLC 를 게임 레코드로 만든다.
 * 반환값은 실제로 만든 수 — 호출부가 로그에 쓴다.
 */
export async function syncDlcs(
  ctx: Ctx,
  source: StoreSource,
  adapter: StoreAdapter,
  applied: Array<{ gameId: string; slug: string; snapshot: StoreSnapshot }>,
  /** 스냅샷이 아니라 별도 요청으로 얻은 목록(sync/dlc-list). 배치 조회가 DLC 목록을 안 주는 소스용 */
  extraGroups: DlcGroup[] = [],
): Promise<number> {
  const groups = [...collectDlcGroups(applied), ...extraGroups];
  if (groups.length === 0) return 0;

  // 한 DLC 가 여러 본편에 걸리는 일은 없지만, 같은 배치에 본편이 두 번 들어오는 경우는 있다
  const parentByExternalId = new Map<string, DlcGroup>();
  for (const g of groups) for (const id of g.externalIds) if (!parentByExternalId.has(id)) parentByExternalId.set(id, g);

  const known = await knownExternalIds(ctx, source, Array.from(parentByExternalId.keys()));
  const fresh = Array.from(parentByExternalId.keys()).filter((id) => !known.has(id));
  if (fresh.length === 0) return 0;
  // 배치 조회가 없는 소스는 새 DLC 한 건이 요청 한 번이다 — 상한이 없으면 DLC 부자 본편 몇 개가
  // 실행 시간을 통째로 먹는다(DLC_FETCH_PER_RUN_BY_SOURCE 주석에 소스별 근거와 그 대가를 적었다)
  const budget = DLC_FETCH_PER_RUN_BY_SOURCE[source];
  const newIds = budget === undefined ? fresh : fresh.slice(0, budget);
  if (newIds.length < fresh.length) {
    console.log(`[sync:${source}] 새 DLC ${fresh.length}건 중 ${newIds.length}건만 이번에 등록 (한 실행 상한)`);
  }

  // 목록이 마스터까지 준 소스는 그 값이 유일한 근거다 — 가격 응답에는 제목도 기기도 없다
  const candidateById = new Map<string, SearchCandidate>();
  for (const g of groups) for (const c of g.candidates ?? []) candidateById.set(c.externalId, c);

  const snapshots = await fetchDlcSnapshots(ctx, source, adapter, newIds);
  let created = 0;
  for (const [externalId, priced] of snapshots) {
    const group = parentByExternalId.get(externalId);
    if (!group) continue;
    // 발견 목록의 마스터를 얹는 일은 일반 수집과 같은 자리다 — 같은 함수를 쓴다(store-apply)
    const candidate = candidateById.get(externalId);
    const snapshot = candidate ? withDiscoveredMedia(priced, candidateAsTarget(candidate, null)) : priced;
    try {
      const child = await createGameFromSnapshot(ctx, snapshot, { contentType: "dlc", parentGameId: group.parentGameId });
      await upsertPlatform(ctx, child.id, child.slug, snapshot);
      // 본편 화면에 DLC 목록이 새로 뜨므로 본편 캐시도 무효화해야 한다
      ctx.changedSlugs.add(group.parentSlug);
      created++;
    } catch (e) {
      recordError(ctx, `${source}:dlc:${externalId}`, e);
    }
  }
  return created;
}

/** DLC 상세 수집. 배치를 지원하는 소스는 배치로, 아니면 단건으로 */
async function fetchDlcSnapshots(
  ctx: Ctx,
  source: StoreSource,
  adapter: StoreAdapter,
  ids: string[],
): Promise<Map<string, StoreSnapshot>> {
  const out = new Map<string, StoreSnapshot>();
  if (adapter.fetchMany) {
    const size = adapter.batchSize ?? DEFAULT_FETCH_BATCH_SIZE;
    for (let i = 0; i < ids.length; i += size) {
      const batch = ids.slice(i, i + size);
      try {
        const byId = await fetchWithRetry(() => adapter.fetchMany!(batch));
        for (const [id, snap] of byId) out.set(id, snap);
      } catch (e) {
        recordError(ctx, `${source}:dlc:batch`, e);
      }
      if (i + size < ids.length) await sleep(adapter.minIntervalMs);
    }
    return out;
  }
  for (const [i, id] of ids.entries()) {
    try {
      out.set(id, await fetchWithRetry(() => adapter.fetch(id)));
    } catch (e) {
      recordError(ctx, `${source}:dlc:${id}`, e);
    }
    if (i < ids.length - 1) await sleep(adapter.minIntervalMs);
  }
  return out;
}
