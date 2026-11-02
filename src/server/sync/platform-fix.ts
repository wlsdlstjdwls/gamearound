// 발견이 지나가는 "이미 아는 상품" 의 기기를 카탈로그와 대조해 바로잡는다(2026-11-02 사용자 지시: 손으로 고친 데이터는 자동화한다).
//
// 왜 발견에서 하나: 일본 eShop 은 기기(hard)를 검색 목록에서만 준다. 가격 갱신은 가격 API 를 쓰는데 그 API 는 기기를 모르고
// 행에 적힌 기기를 그대로 믿는다(store-fetch 의 target.platform). 그래서 처음 붙을 때 틀린 기기는 갱신이 몇 번을 돌아도 남는다.
// 발견은 카탈로그를 처음부터 끝까지 돌며 아는 상품도 한 번씩 지나가므로, 그 자리가 기기를 다시 볼 유일한 기회다.
//
// 고치지 않는 경우(사람 몫으로 남긴다):
//   - 그 게임에 이 나라 행이 둘 이상이다(Switch, Switch 2 판이 둘 다 붙어 있다) — 어느 행이 이 상품인지 행만으로 못 가린다
//   - 관리자가 그 행의 platform 을 잠갔다
// 판정(planPlatformFixes)은 DB 를 모른다 — 테스트가 픽스처로 돈다. 읽기, 쓰기는 fixPlatformsFromCatalog.
import { and, eq, inArray } from "drizzle-orm";
import type { SearchCandidate } from "@/server/adapters/types";
import type { StoreSource } from "@/server/adapters";
import { gamePlatforms, gameSourceRefs, games, type Platform } from "@/server/db/schema";
import { updatedBy } from "@/server/db/audit";
import { errorMessage } from "@/lib/errors";
import { CATALOG_PLATFORM_SOURCES, SOURCE_PLATFORMS, SOURCE_REGION } from "./constants";
import { isLocked, type Ctx } from "./context";

export interface PlatformRowOfRef {
  rowId: string;
  gameId: string;
  slug: string;
  externalId: string;
  platform: Platform;
}

export interface PlatformFix {
  rowId: string;
  slug: string;
  externalId: string;
  from: Platform;
  to: Platform;
}

/** 카탈로그가 말한 기기와 행의 기기가 다르고, 고칠 행이 하나로 정해지는 것만 돌려준다 */
export function planPlatformFixes(candidates: Pick<SearchCandidate, "externalId" | "platform">[], rows: PlatformRowOfRef[], allowed: Platform[]): PlatformFix[] {
  const rowsByRef = new Map<string, PlatformRowOfRef[]>();
  for (const r of rows) rowsByRef.set(r.externalId, [...(rowsByRef.get(r.externalId) ?? []), r]);
  const out: PlatformFix[] = [];
  for (const c of candidates) {
    const to = c.platform;
    if (!to || !allowed.includes(to)) continue;
    const mine = rowsByRef.get(c.externalId) ?? [];
    if (mine.length !== 1) continue;
    const [row] = mine;
    if (row.platform === to) continue;
    out.push({ rowId: row.rowId, slug: row.slug, externalId: c.externalId, from: row.platform, to });
  }
  return out;
}

/**
 * 고친 수를 돌려준다. 고친 게임은 ctx.changedSlugs 에 넣어 상세 캐시를 비운다.
 * 같은 게임에 to 기기 행이 이미 있으면 유일 인덱스(gp_game_platform_region_uq)에 걸린다 — planPlatformFixes 가
 * 행이 하나일 때만 고르므로 닿지 않지만, 그사이 다른 실행이 행을 만들었을 수 있어 행 단위로 실패를 삼킨다.
 */
export async function fixPlatformsFromCatalog(ctx: Ctx, source: StoreSource, candidates: SearchCandidate[]): Promise<number> {
  if (!CATALOG_PLATFORM_SOURCES.includes(source)) return 0;
  const withPlatform = candidates.filter((c) => c.platform);
  if (withPlatform.length === 0) return 0;
  const { db } = ctx;
  const allowed = SOURCE_PLATFORMS[source];
  const rows = await db
    .select({
      rowId: gamePlatforms.id,
      gameId: gamePlatforms.gameId,
      slug: games.slug,
      externalId: gameSourceRefs.externalId,
      platform: gamePlatforms.platform,
    })
    .from(gameSourceRefs)
    .innerJoin(games, eq(games.id, gameSourceRefs.gameId))
    .innerJoin(
      gamePlatforms,
      and(eq(gamePlatforms.gameId, gameSourceRefs.gameId), inArray(gamePlatforms.platform, allowed), eq(gamePlatforms.region, SOURCE_REGION[source])),
    )
    .where(and(eq(gameSourceRefs.source, source), inArray(gameSourceRefs.externalId, withPlatform.map((c) => c.externalId))));

  let fixed = 0;
  for (const f of planPlatformFixes(withPlatform, rows, allowed)) {
    if (isLocked(ctx, "game_platforms", f.rowId, "platform")) continue;
    try {
      await db
        .update(gamePlatforms)
        .set({ platform: f.to, ...updatedBy(`crawler:${source}`) })
        .where(and(eq(gamePlatforms.id, f.rowId), eq(gamePlatforms.platform, f.from)));
      ctx.changedSlugs.add(f.slug);
      fixed++;
      console.log(`[sync:${source}] 기기 바로잡음 ${f.slug} (${f.externalId}) ${f.from} -> ${f.to}`);
    } catch (e) {
      console.warn(`[sync:${source}] 기기 바로잡기 실패 ${f.slug}: ${errorMessage(e)}`);
    }
  }
  return fixed;
}
