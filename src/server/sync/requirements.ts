// 게임 사양을 스토어에 물어보는 단계 — 설계 문서 `docs/기획_사양_내PC호환성_2026-09-17.md` §1, §8-1.
//
// 왜 별도 단계인가: 사양은 배치 응답에 없다. GetItems 에 include_platforms 와
// include_full_description 을 켜고 받아 봐도 requirement 계열 키가 아예 없고(2026-09-18 실측),
// 단건 경로(appdetails)에만 있다. 그래서 게임 1개가 요청 1회다.
//
// 대신 사양은 **거의 안 변한다** — 재발매나 대규모 패치 때만 바뀐다. 그래서 가격처럼 매번 돌리지 않고
// 두 가지로 막는다(dlc-list 와 같은 모양):
//   - 한 실행에서 물어볼 건수 상한(REQUIREMENTS_PER_RUN)
//   - 이미 물어본 행은 REQUIREMENTS_REFRESH_DAYS 동안 다시 묻지 않는다(game_platforms.requirements_listed_at)
// 대상은 이번 배치에서 이미 가격을 갱신한 본편들 중에서 고른다. 백필은 이 상한으로는 느려서
// 따로 돈다 — scripts/backfill-requirements.ts(로컬 회선, Actions 분을 쓰지 않는다).
import { and, eq, inArray } from "drizzle-orm";
import { gamePlatforms, gameRequirementParts, gameRequirements, type Platform } from "@/server/db/schema";
import type { StoreSource } from "@/server/adapters";
import type { KoreanSupport, RequirementSnapshot, StoreAdapter } from "@/server/adapters/types";
import { sleep } from "@/lib/async";
import { extractParts, PART_MATCH_VERSION } from "@/lib/hardware";
import { REQUIREMENTS_PER_RUN, REQUIREMENTS_REFRESH_DAYS, SOURCE_PLATFORMS, SOURCE_REGION } from "./constants";
import { isLocked, recordError, type Ctx } from "./context";
import { refreshFloors } from "./requirement-floors";
import { fetchWithRetry } from "./retry";
import { runStatements, type Applied, type Statement } from "./store-apply";
import { createdBy, updatedBy } from "@/server/db/audit";

const DAY_MS = 24 * 60 * 60 * 1000;

/** 대상 선정에 필요한 플랫폼 행의 일부 */
export interface RequirementRow {
  id: string;
  gameId: string;
  /** 사양 행에 그대로 적을 출처. 소스 하나가 기기 여럿을 파는 경우(psstore)를 상수로 짐작하지 않는다 */
  platform: Platform;
  storeExternalId: string | null;
  /** 에픽은 사양을 페이지 slug 로 묻는다. 그 slug 가 들어 있는 자리가 여기뿐이다(StoreAdapter.requirementsKey) */
  storeUrl: string | null;
  requirementsListedAt: Date | null;
  /** 사양 응답에 같이 오는 한국어 지원의 지금 값. 달라졌을 때만 쓰려고 들고 다닌다(planKorean) */
  koText?: boolean | null;
  koVoice?: boolean | null;
}

/** 이번 실행에서 사양을 물어볼 게임 1건 */
export interface RequirementPick {
  platformId: string;
  gameId: string;
  platform: Platform;
  slug: string;
  key: string;
  /** 열쇠가 store_url 인 소스가 다른 길로 다시 물을 때 쓴다(StoreAdapter.fetchRequirements 주석) */
  externalId: string | null;
  koText: boolean | null;
  koVoice: boolean | null;
}

/**
 * 사양을 물어볼 게임을 고른다. DB 를 보지 않아 테스트가 가능하다.
 * 한 번도 안 물어본 행이 늘 먼저다 — 카탈로그를 한 바퀴 도는 일이 먼저 끝나야
 * "사양이 아예 없는 게임" 이 줄어든다. 재조회는 그 뒤의 일이다.
 */
export function pickRequirementTargets(
  targets: Array<{ gameId: string; slug: string }>,
  rows: RequirementRow[],
  now: Date,
  max: number = REQUIREMENTS_PER_RUN,
  requirementsKey: "externalId" | "storeUrl" = "externalId",
  refreshDays: number = REQUIREMENTS_REFRESH_DAYS,
): RequirementPick[] {
  const slugByGame = new Map(targets.map((t) => [t.gameId, t.slug]));
  const keyOf = (r: RequirementRow) => (requirementsKey === "storeUrl" ? r.storeUrl : r.storeExternalId);
  const staleBefore = now.getTime() - refreshDays * DAY_MS;

  const stale = rows.filter((r) => {
    // 열쇠가 없는 행은 물어볼 방법이 없다. 여기서 빼지 않으면 그 행이 매 회차 몫을 먹고
    // 빈손으로 돌아오며, 뒤에 선 게임의 차례를 가져간다
    if (!keyOf(r)) return false;
    if (!slugByGame.has(r.gameId)) return false;
    return r.requirementsListedAt === null || r.requirementsListedAt.getTime() <= staleBefore;
  });
  stale.sort((a, b) => (a.requirementsListedAt?.getTime() ?? 0) - (b.requirementsListedAt?.getTime() ?? 0));

  const out: RequirementPick[] = [];
  const seen = new Set<string>();
  for (const row of stale) {
    if (out.length >= max) break;
    if (seen.has(row.gameId)) continue;
    seen.add(row.gameId);
    out.push({ platformId: row.id, gameId: row.gameId, platform: row.platform, slug: slugByGame.get(row.gameId)!, key: keyOf(row)!, externalId: row.storeExternalId, koText: row.koText ?? null, koVoice: row.koVoice ?? null });
  }
  return out;
}

/**
 * 사양 응답에 실려 온 한국어 지원 → 플랫폼 행에 쓸 값. 바뀐 칸만 담는다.
 *
 * 사양과 달리 여기는 견주고 쓴다: 이 값은 상세 화면에 바로 서므로, 바뀌었을 때만 그 게임의 캐시를 풀어야 한다.
 * 견줄 기존 값은 대상을 고를 때 이미 읽어 왔다(RequirementRow) — 왕복이 늘지 않는다.
 * 응답이 말하지 않은 칸(undefined)과 잠긴 칸은 건드리지 않는다(§7).
 */
export function planKorean(
  ctx: Ctx,
  pick: Pick<RequirementPick, "platformId" | "koText" | "koVoice">,
  korean: KoreanSupport | undefined,
): { koText?: boolean; koVoice?: boolean } {
  const set: { koText?: boolean; koVoice?: boolean } = {};
  if (!korean) return set;
  if (korean.text !== undefined && korean.text !== pick.koText && !isLocked(ctx, "game_platforms", pick.platformId, "koText")) set.koText = korean.text;
  if (korean.voice !== undefined && korean.voice !== pick.koVoice && !isLocked(ctx, "game_platforms", pick.platformId, "koVoice")) set.koVoice = korean.voice;
  return set;
}

/**
 * 받은 사양을 쓸 문장으로. (게임, 스토어, OS, 등급)이 한 행이라 다시 물어보면 덮어쓴다.
 *
 * 값이 그대로여도 덮어쓰는 이유(가격 경로와 다른 점): 이 경로는 REQUIREMENTS_REFRESH_DAYS 만에
 * 한 번 도는 데다 화면 캐시를 흔들 일이 없다. 달라진 것만 골라내려고 기존 6행을 먼저 읽으면
 * 게임마다 왕복이 한 번씩 더 붙는데, 그 값으로 사는 것이 없다.
 */
export function planRequirements(ctx: Ctx, gameId: string, platform: Platform, snapshots: RequirementSnapshot[]): Statement[] {
  return snapshots.map((s) =>
    ctx.db
      .insert(gameRequirements)
      .values({ gameId, platform, ...s, parseConfidence: String(s.parseConfidence), ...createdBy(`crawler:${ctx.source}`) })
      .onConflictDoUpdate({
        target: [gameRequirements.gameId, gameRequirements.platform, gameRequirements.osFamily, gameRequirements.tier],
        set: {
          rawHtml: s.rawHtml,
          osText: s.osText,
          cpuText: s.cpuText,
          gpuText: s.gpuText,
          directxText: s.directxText,
          noteText: s.noteText,
          ramMb: s.ramMb,
          vramMb: s.vramMb,
          storageMb: s.storageMb,
          parseVersion: s.parseVersion,
          parseConfidence: String(s.parseConfidence),
          // updatedBy 가 updated_at 까지 같이 올린다(db/audit)
          ...updatedBy(`crawler:${ctx.source}`),
        },
      }),
  );
}

/**
 * 사양 행들 → 부품 후보 쓰기 문장. 행마다 기존 후보를 지우고 새로 넣는다.
 *
 * 값을 견주지 않고 통째로 갈아 끼우는 이유: 후보는 사양 문구에서 **파생된** 값이라
 * 원본이 같으면 결과도 같고, 다르면 통째로 다르다. 어느 후보가 달라졌는지 세는 일에
 * 값어치가 없다(가격과 다른 점이다 — 그쪽은 변동 자체가 알릴 사건이다).
 *
 * 사전이나 매칭 규칙을 고치면 PART_MATCH_VERSION 을 올리고 재매칭을 돌린다.
 */
export function planRequirementParts(ctx: Ctx, rows: Array<{ id: number; cpuText: string | null; gpuText: string | null }>): Statement[] {
  const out: Statement[] = [];
  for (const row of rows) {
    out.push(ctx.db.delete(gameRequirementParts).where(eq(gameRequirementParts.requirementId, row.id)));
    const parts = [...extractParts("cpu", row.cpuText), ...extractParts("gpu", row.gpuText)];
    if (parts.length === 0) continue;
    out.push(
      ctx.db.insert(gameRequirementParts).values(
        parts.map((p) => ({
          requirementId: row.id,
          kind: p.kind,
          rawText: p.rawText,
          modelKey: p.modelKey,
          tier: p.tier,
          vramMb: p.vramMb,
          isAlternative: p.isAlternative,
          matchVersion: PART_MATCH_VERSION,
          ...createdBy(`crawler:${ctx.source}`),
        })),
      ),
    );
  }
  return out;
}

/**
 * 방금 쓴 사양 행을 되읽어 부품 후보를 채운다.
 *
 * 되읽는 이유: 후보 행은 사양 행의 id 를 참조하는데 그 id 는 INSERT 가 끝나야 안다.
 * 게임마다 되읽으면 왕복이 건수만큼 늘어나므로 **배치 전체를 한 번에** 읽는다.
 */
async function syncPartsFor(ctx: Ctx, gameIds: string[]): Promise<void> {
  if (gameIds.length === 0) return;
  const rows = await ctx.db
    .select({ id: gameRequirements.id, cpuText: gameRequirements.cpuText, gpuText: gameRequirements.gpuText })
    .from(gameRequirements)
    .where(inArray(gameRequirements.gameId, gameIds));
  await runStatements(ctx, `${ctx.source}:requirement-parts`, planRequirementParts(ctx, rows));
  // 문턱은 후보에서 접는 값이라 후보가 앉은 뒤에만 맞다. 여기서 안 접으면 목록 필터가 어제 값을 본다
  await refreshFloors(ctx, gameIds);
}

/**
 * 이번 배치에서 갱신한 게임들에게 사양을 물어본다. 받은 건수를 돌려준다.
 *
 * DLC 는 묻지 않는다 — 추가 콘텐츠에는 자기 사양이 없고(본편 사양이 곧 그 사양이다),
 * 물어 봐야 본편과 똑같은 문구를 수만 행 더 쌓을 뿐이다.
 */
export async function syncRequirements(
  ctx: Ctx,
  source: StoreSource,
  adapter: StoreAdapter,
  applied: Applied[],
  max: number = REQUIREMENTS_PER_RUN,
  /** 다시 묻기까지 기다릴 날수. 백필이 이미 물어본 행을 다시 물을 때만 줄인다(scripts/backfill-requirements --korean) */
  refreshDays: number = REQUIREMENTS_REFRESH_DAYS,
): Promise<number> {
  if (!adapter.fetchRequirements) return 0;
  const targets = applied
    .filter((a) => a.snapshot.contentType !== "dlc" && a.snapshot.contentType !== "demo" && a.snapshot.contentType !== "music")
    .map((a) => ({ gameId: a.gameId, slug: a.slug }));
  if (targets.length === 0) return 0;

  const rows = await ctx.db
    .select({
      id: gamePlatforms.id,
      gameId: gamePlatforms.gameId,
      platform: gamePlatforms.platform,
      storeExternalId: gamePlatforms.storeExternalId,
      storeUrl: gamePlatforms.storeUrl,
      requirementsListedAt: gamePlatforms.requirementsListedAt,
      koText: gamePlatforms.koText,
      koVoice: gamePlatforms.koVoice,
    })
    .from(gamePlatforms)
    .where(
      and(
        inArray(gamePlatforms.gameId, targets.map((t) => t.gameId)),
        inArray(gamePlatforms.platform, SOURCE_PLATFORMS[source]),
        eq(gamePlatforms.region, SOURCE_REGION[source]),
      ),
    );

  const picks = pickRequirementTargets(targets, rows, ctx.now, max, adapter.requirementsKey, refreshDays);
  if (picks.length === 0) return 0;

  const statements: Statement[] = [];
  let received = 0;
  for (const [i, pick] of picks.entries()) {
    try {
      const { requirements: snapshots, korean } = await fetchWithRetry(() => adapter.fetchRequirements!(pick.key, pick.externalId ?? undefined));
      const koSet = planKorean(ctx, pick, korean);
      // 사양이 없는 게임도 답이다 — 물어봤다는 사실을 남겨야 다음 실행이 같은 게임을 또 묻지 않는다.
      // 옛 인디 게임에는 사양 칸이 통째로 비어 있는 경우가 있다. 한국어 지원도 같은 행이라 한 문장에 싣는다
      statements.push(
        ctx.db.update(gamePlatforms).set({ requirementsListedAt: ctx.now, ...koSet }).where(eq(gamePlatforms.id, pick.platformId)),
      );
      if (Object.keys(koSet).length > 0) ctx.changedSlugs.add(pick.slug);
      if (snapshots.length > 0) {
        statements.push(...planRequirements(ctx, pick.gameId, pick.platform, snapshots));
        received += snapshots.length;
        // 사양표는 상세 화면에 서므로 그 게임의 캐시를 푼다
        ctx.changedSlugs.add(pick.slug);
      }
    } catch (e) {
      // 실패는 표시하지 않는다 — 다음 실행이 다시 물어본다
      recordError(ctx, `${source}:requirements:${pick.key}`, e);
    }
    if (i < picks.length - 1) await sleep(adapter.minIntervalMs);
  }
  await runStatements(ctx, `${source}:requirements`, statements);
  // 후보 추출은 사양 행이 DB 에 앉은 뒤에만 할 수 있다(syncPartsFor 주석)
  await syncPartsFor(ctx, [...new Set(picks.map((p) => p.gameId))]);
  return received;
}
