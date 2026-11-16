// 상품 페이지에서만 보이는 게임 마스터 칸 채우기 — 지금은 유통사 하나(psstore 콘셉트 페이지).
//
// 왜(2026-11-16 실측): PS 상세 질의에는 개발사, 유통사 필드가 아예 없어서 PS 에서만 들어온 본편 1,003건이 회사 칸이 비었다.
// 콘셉트 페이지에는 유통사가 있다(adapters/psstore/concept-page, 러너 표본 4/4). 개발사는 페이지에도 없다.
//
// 규칙은 game-writer 와 같다: 빈 칸만 채우고(PS 는 META_OVERWRITE_SOURCES 가 아니다), 잠긴 칸은 건드리지 않는다.
// 페이지가 무거워 회차마다 상한(STORE_PAGE_META_LIMIT_BY_SOURCE)만큼만 묻는다. 빈 게임만 고르므로 채워질수록 요청이 준다.
// 회사 행 잇기(game_companies)는 하지 않는다 — 그건 회사 수집이 이름을 보고 따로 한다.
import { and, eq, inArray, sql } from "drizzle-orm";
import { games } from "@/server/db/schema";
import type { StoreAdapter } from "@/server/adapters/types";
import type { StoreSource } from "@/server/adapters";
import { sleep } from "@/lib/async";
import { STORE_PAGE_META_LIMIT_BY_SOURCE } from "./constants";
import { isLocked, recordError, type Ctx } from "./context";
import { fetchWithRetry } from "./retry";
import type { Applied } from "./store-apply";

/** 이번 회차에 반영한 본편 중 유통사가 빈 것을 골라 상품 페이지로 채운다. 채운 수를 돌려준다 */
export async function fillPublishersFromStorePage(ctx: Ctx, source: StoreSource, adapter: StoreAdapter, applied: Applied[]): Promise<number> {
  const limit = STORE_PAGE_META_LIMIT_BY_SOURCE[source] ?? 0;
  if (!adapter.fetchStorePage || limit <= 0 || applied.length === 0) return 0;
  const byGame = new Map(applied.map((a) => [a.gameId, a]));
  // 본편만 — 추가 콘텐츠는 상품 id 라 콘셉트 페이지가 없다
  const empty = await ctx.db
    .select({ id: games.id })
    .from(games)
    .where(and(inArray(games.id, [...byGame.keys()]), eq(games.contentType, "game"), sql`coalesce(${games.publisher}, '') = ''`));
  const targets = empty.map((r) => byGame.get(r.id)!).filter((a) => !isLocked(ctx, "games", a.gameId, "publisher")).slice(0, limit);

  let filled = 0;
  for (const t of targets) {
    await sleep(adapter.minIntervalMs);
    try {
      const page = await fetchWithRetry(() => adapter.fetchStorePage!(t.snapshot.storeExternalId));
      if (!page.publisher) continue;
      const done = await ctx.db
        .update(games)
        .set({ publisher: page.publisher, updatedAt: ctx.now })
        .where(and(eq(games.id, t.gameId), sql`coalesce(${games.publisher}, '') = ''`))
        .returning({ id: games.id });
      if (done.length > 0) {
        filled++;
        ctx.changedSlugs.add(t.slug);
      }
    } catch (e) {
      // 한 게임의 실패가 회차를 멈추지 않는다 (§7)
      recordError(ctx, `${source}:${t.snapshot.storeExternalId}:publisher`, e);
    }
  }
  return filled;
}
