// DLC 반영 — 기획서 F5.
//
// DLC 를 별도 테이블이 아니라 games 행으로 담는다(기획서 5.4). 그래서 이 파일이 하는 일은
// "본편이 알려준 DLC 중 아직 모르는 것을 게임 레코드로 만드는 것" 하나뿐이다.
// 한 번 만들어지면 그 DLC 는 자기 gameSourceRefs 를 갖게 되고, 다음 배치부터는
// 일반 게임과 똑같은 경로(listStoreTargets)로 가격이 갱신된다 — 여기서 다시 손대지 않는다.
//
// 상한(DLC_PER_GAME_MAX)을 두는 이유: DLC 가 수십 개인 타이틀 하나가 배치를 통째로 먹는다.
import { and, eq, inArray } from "drizzle-orm";
import { gameSourceRefs, games } from "@/server/db/schema";
import type { StoreAdapter, StoreSnapshot } from "@/server/adapters/types";
import type { StoreSource } from "@/server/adapters";
import { sleep } from "@/lib/async";
import { DEFAULT_FETCH_BATCH_SIZE, DLC_PER_GAME_MAX } from "./constants";
import { recordError, type Ctx } from "./context";
import { createGameFromSnapshot } from "./game-writer";
import { upsertPlatform } from "./platform-writer";
import { fetchWithRetry } from "./retry";

/** 본편 1건과 그 본편이 알려준 DLC 외부 ID 들 */
export interface DlcGroup {
  parentGameId: string;
  parentSlug: string;
  externalIds: string[];
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
): Promise<number> {
  const groups = collectDlcGroups(applied);
  if (groups.length === 0) return 0;

  // 한 DLC 가 여러 본편에 걸리는 일은 없지만, 같은 배치에 본편이 두 번 들어오는 경우는 있다
  const parentByExternalId = new Map<string, DlcGroup>();
  for (const g of groups) for (const id of g.externalIds) if (!parentByExternalId.has(id)) parentByExternalId.set(id, g);

  const known = await knownExternalIds(ctx, source, Array.from(parentByExternalId.keys()));
  const newIds = Array.from(parentByExternalId.keys()).filter((id) => !known.has(id));
  if (newIds.length === 0) return 0;

  const snapshots = await fetchDlcSnapshots(ctx, source, adapter, newIds);
  let created = 0;
  for (const [externalId, snapshot] of snapshots) {
    const group = parentByExternalId.get(externalId);
    if (!group) continue;
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

/**
 * DLC 가 스스로 본편을 알려준 경우의 보정(steam 의 fullgame).
 * 매칭 단계에서 DLC 가 본편보다 먼저 등록되는 순서 문제를 여기서 되돌린다.
 */
export async function attachParentIfKnown(ctx: Ctx, gameId: string, source: StoreSource, snapshot: StoreSnapshot): Promise<void> {
  if (snapshot.contentType !== "dlc" || !snapshot.parentExternalId) return;
  const cur = await ctx.db.query.games.findFirst({ where: eq(games.id, gameId), columns: { contentType: true, parentGameId: true } });
  if (!cur || (cur.contentType === "dlc" && cur.parentGameId)) return;

  const parentRef = await ctx.db.query.gameSourceRefs.findFirst({
    where: and(eq(gameSourceRefs.source, source), eq(gameSourceRefs.externalId, snapshot.parentExternalId)),
    columns: { gameId: true },
  });
  if (!parentRef || parentRef.gameId === gameId) return;
  await ctx.db.update(games).set({ contentType: "dlc", parentGameId: parentRef.gameId, updatedAt: ctx.now }).where(eq(games.id, gameId));
}
