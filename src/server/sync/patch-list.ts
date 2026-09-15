// 게임의 패치 기록을 스토어에 물어보는 단계 — 기획서 v2 2번("업데이트 노트, 플랫폼별 패치 속도 비교").
//
// 왜 별도 단계인가: 가격 수집은 배치로 도는데(steam GetItems 100건/요청) 패치 기록은 배치가 없다.
// 게임 1개가 요청 1회라 가격 경로에 얹으면 배치의 이점이 통째로 사라진다. DLC 목록과 같은 모양이라
// 막는 방법도 같다:
//   - 한 실행에서 물어볼 건수 상한(PATCH_LIST_PER_RUN)
//   - 이미 물어본 게임은 PATCH_LIST_REFRESH_DAYS 동안 다시 묻지 않는다(game_platforms.patch_listed_at)
//
// 대상은 이번 배치에서 이미 가격을 갱신한 게임들 중에서 고른다 — 가격 수집이 카탈로그를 한 바퀴
// 돌기 때문에, 따로 대상을 뽑지 않아도 모든 게임이 언젠가 이 자리를 지나간다(dlc-list 와 같은 전제).
//
// 패치 기록을 주는 스토어는 steam 과 gog 둘뿐이다. 나머지가 왜 빠졌는지는
// adapters/types 의 listPatchNotes 주석에 실측으로 적어 뒀다.
import { and, eq, inArray } from "drizzle-orm";
import { gamePlatforms, patchNotes } from "@/server/db/schema";
import type { StoreSource } from "@/server/adapters";
import type { PatchNote, StoreAdapter } from "@/server/adapters/types";
import { sleep } from "@/lib/async";
import {
  PATCH_LIST_PER_RUN,
  PATCH_LIST_PER_RUN_BY_SOURCE,
  PATCH_LIST_REFRESH_DAYS,
  PATCH_PER_GAME_MAX,
  SOURCE_PLATFORMS,
  SOURCE_REGION,
  WRITE_BATCH_SIZE,
} from "./constants";
import { recordError, type Ctx } from "./context";
import { fetchWithRetry } from "./retry";
import { runStatements, type Applied, type Statement } from "./store-apply";

const DAY_MS = 24 * 60 * 60 * 1000;

/** 대상 선정에 필요한 플랫폼 행의 일부 */
export interface PatchListRow {
  id: string;
  gameId: string;
  storeExternalId: string | null;
  patchListedAt: Date | null;
}

/** 이번 실행에서 패치 기록을 물어볼 게임 1건 */
export interface PatchListPick {
  platformId: string;
  gameId: string;
  slug: string;
  /** 어댑터에 넘길 질의 키 = 스토어 외부 ID */
  key: string;
}

/**
 * 물어볼 게임을 고른다. DB 를 보지 않아 테스트가 가능하다.
 * 한 번도 안 물어본 게임이 늘 먼저다 — 그래야 카탈로그 전체를 한 바퀴 도는 일이 먼저 끝난다.
 */
export function pickPatchListTargets(
  candidates: Array<{ gameId: string; slug: string }>,
  rows: PatchListRow[],
  now: Date,
  max: number = PATCH_LIST_PER_RUN,
): PatchListPick[] {
  const slugByGame = new Map(candidates.map((c) => [c.gameId, c.slug]));
  const staleBefore = now.getTime() - PATCH_LIST_REFRESH_DAYS * DAY_MS;

  const stale = rows.filter((r) => {
    if (!r.storeExternalId) return false;
    if (!slugByGame.has(r.gameId)) return false;
    return r.patchListedAt === null || r.patchListedAt.getTime() <= staleBefore;
  });
  // 한 번도 안 물어본 것(null → 0) 먼저, 그다음 오래된 순
  stale.sort((a, b) => (a.patchListedAt?.getTime() ?? 0) - (b.patchListedAt?.getTime() ?? 0));

  const out: PatchListPick[] = [];
  const seen = new Set<string>();
  for (const row of stale) {
    if (out.length >= max) break;
    if (seen.has(row.gameId)) continue;
    seen.add(row.gameId);
    out.push({ platformId: row.id, gameId: row.gameId, slug: slugByGame.get(row.gameId)!, key: row.storeExternalId! });
  }
  return out;
}

/** 어댑터가 준 기록 → patch_notes 행. 상한을 여기서 자른다 */
export function toPatchRows(
  source: StoreSource,
  gamePlatformId: string,
  notes: PatchNote[],
): Array<typeof patchNotes.$inferInsert> {
  return notes.slice(0, PATCH_PER_GAME_MAX).map((n) => ({
    gamePlatformId,
    source,
    externalId: n.externalId,
    version: n.version ?? null,
    title: n.title,
    url: n.url ?? null,
    publishedAt: new Date(n.publishedAt),
  }));
}

/**
 * 이번 배치에서 갱신한 게임들에게 패치 기록을 물어본다. 새로 들어온 행 수를 돌려준다.
 *
 * 이미 있는 기록은 건드리지 않는다(onConflictDoNothing). 스토어가 지난 공지의 제목을 고치는 일은
 * 드물고, 그걸 따라가자고 매 실행 수천 행을 다시 쓰면 캐시 무효화만 늘어난다(§7).
 */
export async function syncPatchNotes(
  ctx: Ctx,
  source: StoreSource,
  adapter: StoreAdapter,
  applied: Applied[],
): Promise<number> {
  if (!adapter.listPatchNotes) return 0;
  // DLC 에는 자기 패치 기록이 없다 — 패치는 본편 단위로 나온다
  const candidates = applied.filter((a) => a.snapshot.contentType !== "dlc").map((a) => ({ gameId: a.gameId, slug: a.slug }));
  if (candidates.length === 0) return 0;

  const rows = await ctx.db
    .select({
      id: gamePlatforms.id,
      gameId: gamePlatforms.gameId,
      storeExternalId: gamePlatforms.storeExternalId,
      patchListedAt: gamePlatforms.patchListedAt,
    })
    .from(gamePlatforms)
    .where(
      and(
        inArray(gamePlatforms.gameId, candidates.map((c) => c.gameId)),
        inArray(gamePlatforms.platform, SOURCE_PLATFORMS[source]),
        // 지역이 다르면 다른 행이다 — 한 행의 "물어본 시각" 으로 다른 행을 건너뛰면 안 된다
        eq(gamePlatforms.region, SOURCE_REGION[source]),
      ),
    );

  const picks = pickPatchListTargets(candidates, rows, ctx.now, PATCH_LIST_PER_RUN_BY_SOURCE[source] ?? PATCH_LIST_PER_RUN);
  if (picks.length === 0) return 0;

  const values: Array<typeof patchNotes.$inferInsert> = [];
  const slugByPlatform = new Map<string, string>();
  const marks: Statement[] = [];
  for (const [i, pick] of picks.entries()) {
    try {
      const notes = await fetchWithRetry(() => adapter.listPatchNotes!(pick.key));
      // 빈 목록도 답이다 — 물어봤다는 사실을 남겨야 다음 실행이 같은 게임을 또 묻지 않는다
      marks.push(ctx.db.update(gamePlatforms).set({ patchListedAt: ctx.now }).where(eq(gamePlatforms.id, pick.platformId)));
      slugByPlatform.set(pick.platformId, pick.slug);
      values.push(...toPatchRows(source, pick.platformId, notes));
    } catch (e) {
      // 실패는 표시하지 않는다 — 다음 실행이 다시 물어본다
      recordError(ctx, `${source}:patch-list:${pick.key}`, e);
    }
    if (i < picks.length - 1) await sleep(adapter.minIntervalMs);
  }

  // 여기서 store-apply 의 insertChunked 를 쓰지 않는 이유: 그쪽은 RETURNING 이 넣은 순서대로
  // 1:1 로 돌아온다고 보고 입력과 짝을 맞춘다. onConflictDoNothing 은 **새로 들어간 행만** 돌려줘서
  // 그 짝이 어긋난다. 우리에게 필요한 것도 짝이 아니라 "실제로 새로 들어온 행" 뿐이다.
  let inserted = 0;
  for (let i = 0; i < values.length; i += WRITE_BATCH_SIZE) {
    const chunk = values.slice(i, i + WRITE_BATCH_SIZE);
    try {
      const rowsBack = await ctx.db
        .insert(patchNotes)
        .values(chunk)
        .onConflictDoNothing({ target: [patchNotes.gamePlatformId, patchNotes.externalId] })
        .returning({ gamePlatformId: patchNotes.gamePlatformId });
      inserted += rowsBack.length;
      // 새 기록이 들어온 게임만 캐시를 깬다(§7) — 같은 목록을 다시 받은 게임은 화면이 그대로다
      for (const r of rowsBack) {
        const slug = slugByPlatform.get(r.gamePlatformId);
        if (slug) ctx.changedSlugs.add(slug);
      }
    } catch (e) {
      recordError(ctx, `${source}:patch-notes:${i}`, e);
    }
  }

  await runStatements(ctx, `${source}:patch-listed`, marks);
  return inserted;
}
