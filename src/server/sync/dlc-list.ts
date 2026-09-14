// 본편이 가진 DLC 목록을 스토어에 물어보는 단계 — 기획서 F5 의 빠진 반쪽.
//
// 왜 별도 단계인가: Steam 수집은 GetItems 배치로 돈다. 그 응답은 "자식이 부모를 가리키는" 방향만
// 주고 본편이 가진 DLC 목록은 주지 않는다(2026-09-14 실측). 그래서 DLC 를 먼저 만나지 않는 한
// 본편을 아무리 갱신해도 그 DLC 는 영원히 안 들어왔다. 목록은 단건 요청(appdetails)에만 있다.
//
// 요청이 비싸므로(게임 1개 = 요청 1회) 두 가지로 막는다:
//   - 한 실행에서 물어볼 건수 상한(DLC_LIST_PER_RUN)
//   - 이미 물어본 본편은 DLC_LIST_REFRESH_DAYS 동안 다시 묻지 않는다(game_platforms.dlc_listed_at)
// 대상은 이번 배치에서 이미 가격을 갱신한 본편들 중에서 고른다 — 가격 수집이 카탈로그를 한 바퀴
// 돌기 때문에, 따로 대상을 뽑지 않아도 모든 본편이 언젠가 이 자리를 지나간다.
import { and, eq, inArray } from "drizzle-orm";
import { gamePlatforms } from "@/server/db/schema";
import type { StoreSource } from "@/server/adapters";
import type { StoreAdapter } from "@/server/adapters/types";
import { sleep } from "@/lib/async";
import { DLC_LIST_PER_RUN, DLC_LIST_REFRESH_DAYS, DLC_PER_GAME_MAX, SOURCE_PLATFORMS } from "./constants";
import { recordError, type Ctx } from "./context";
import type { DlcGroup } from "./dlc-writer";
import { fetchWithRetry } from "./retry";
import { runStatements, type Applied, type Statement } from "./store-apply";

const DAY_MS = 24 * 60 * 60 * 1000;

/** 대상 선정에 필요한 플랫폼 행의 일부 */
export interface DlcListRow {
  id: string;
  gameId: string;
  storeExternalId: string | null;
  dlcListedAt: Date | null;
}

/** 이번 실행에서 목록을 물어볼 본편 1건 */
export interface DlcListPick {
  platformId: string;
  gameId: string;
  slug: string;
  externalId: string;
}

/**
 * 목록을 물어볼 본편을 고른다. DB 를 보지 않아 테스트가 가능하다.
 * 한 번도 안 물어본 본편이 늘 먼저다 — 그래야 카탈로그 전체를 한 바퀴 도는 일이 먼저 끝난다.
 */
export function pickDlcListTargets(
  parents: Array<{ gameId: string; slug: string }>,
  rows: DlcListRow[],
  now: Date,
  max: number = DLC_LIST_PER_RUN,
): DlcListPick[] {
  const slugByGame = new Map(parents.map((p) => [p.gameId, p.slug]));
  const staleBefore = now.getTime() - DLC_LIST_REFRESH_DAYS * DAY_MS;

  const stale = rows.filter((r) => {
    if (!r.storeExternalId) return false;
    if (!slugByGame.has(r.gameId)) return false;
    return r.dlcListedAt === null || r.dlcListedAt.getTime() <= staleBefore;
  });
  // null(한 번도 안 물어봄) → 오래된 순. 같은 게임에 플랫폼 행이 여럿인 소스(psstore)는 먼저 온 행 하나만 쓴다
  stale.sort((a, b) => (a.dlcListedAt?.getTime() ?? 0) - (b.dlcListedAt?.getTime() ?? 0));

  const out: DlcListPick[] = [];
  const seen = new Set<string>();
  for (const row of stale) {
    if (out.length >= max) break;
    if (seen.has(row.gameId)) continue;
    seen.add(row.gameId);
    out.push({ platformId: row.id, gameId: row.gameId, slug: slugByGame.get(row.gameId)!, externalId: row.storeExternalId! });
  }
  return out;
}

/**
 * 이번 배치에서 갱신한 본편들에게 DLC 목록을 물어본다.
 * 반환값은 dlc-writer 가 그대로 받는 그룹 목록이고, 실제 등록은 거기서 한다.
 *
 * 스냅샷이 이미 DLC 목록을 들고 온 소스(appdetails 단건 경로)는 건너뛴다 — 같은 것을 두 번 묻지 않는다.
 */
export async function listParentDlcs(
  ctx: Ctx,
  source: StoreSource,
  adapter: StoreAdapter,
  applied: Applied[],
): Promise<DlcGroup[]> {
  if (!adapter.listDlcIds) return [];
  const parents = applied
    .filter((a) => a.snapshot.contentType !== "dlc" && a.snapshot.dlcExternalIds === undefined)
    .map((a) => ({ gameId: a.gameId, slug: a.slug }));
  if (parents.length === 0) return [];

  const rows = await ctx.db
    .select({
      id: gamePlatforms.id,
      gameId: gamePlatforms.gameId,
      storeExternalId: gamePlatforms.storeExternalId,
      dlcListedAt: gamePlatforms.dlcListedAt,
    })
    .from(gamePlatforms)
    .where(and(inArray(gamePlatforms.gameId, parents.map((p) => p.gameId)), inArray(gamePlatforms.platform, SOURCE_PLATFORMS[source])));

  const picks = pickDlcListTargets(parents, rows, ctx.now);
  if (picks.length === 0) return [];

  const groups: DlcGroup[] = [];
  const marks: Statement[] = [];
  for (const [i, pick] of picks.entries()) {
    try {
      const ids = await fetchWithRetry(() => adapter.listDlcIds!(pick.externalId));
      // 빈 목록도 답이다 — 물어봤다는 사실을 남겨야 다음 실행이 같은 본편을 또 묻지 않는다
      marks.push(ctx.db.update(gamePlatforms).set({ dlcListedAt: ctx.now }).where(eq(gamePlatforms.id, pick.platformId)));
      if (ids.length > 0) {
        groups.push({ parentGameId: pick.gameId, parentSlug: pick.slug, externalIds: ids.slice(0, DLC_PER_GAME_MAX) });
      }
    } catch (e) {
      // 실패는 표시하지 않는다 — 다음 실행이 다시 물어본다
      recordError(ctx, `${source}:dlc-list:${pick.externalId}`, e);
    }
    if (i < picks.length - 1) await sleep(adapter.minIntervalMs);
  }
  await runStatements(ctx, `${source}:dlc-list`, marks);
  return groups;
}
