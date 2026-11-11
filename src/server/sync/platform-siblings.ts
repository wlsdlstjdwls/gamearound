// 상세가 기본 상품 하나의 값만 줄 때, 같은 게임의 다른 기기 행 값을 스토어 답으로 맞춘다.
//
// 왜(2026-11-11 실측): PS 콘셉트 상세는 기본 상품(대개 PS5) 값만 줘서 PS4 행이 1,676게임에서 09-15 값에 멈췄고,
// 406행은 두 달 전 할인을 그대로 보였다. 어댑터가 그 기기를 어떻게 파는지 알려 주면(platformProducts) 셋으로 가른다:
// - product: 그 기기 상품을 따로 묻는다. 상품 값에는 할인 종료 시각이 같이 온다 — 짐작이 아니라 스토어 답으로 기간을 안다.
// - same: 한 상품을 두 기기로 판다("PS4 & PS5"). 본편 값이 곧 그 기기 값이라 요청 없이 같은 값을 쓴다.
// - absent: 이 나라 스토어가 그 기기 상품을 안 판다. 남은 할인은 확인해 줄 곳이 없으니 걷는다(ended-discounts 와 같은 길).
//
// 하지 않기로 한 것:
// - **없는 기기 행을 새로 만들지 않는다.** 이미 있는 행만 고친다. 새 행은 그 기기 판매를 화면에 새로 띄우는 일이라
//   상품 고르기가 틀렸을 때 잘못이 더 크게 보인다. 지금 문제는 있는 행이 멈춘 것이다.
// - 가격 칸만 쓴다(제목, 회사, 부모 잇기는 본편 스냅샷 몫). 상품 응답의 이름은 에디션 꼬리가 붙어 게임 제목을 덮으면 안 된다.
// - absent 행을 지우지 않는다. 지우기는 사람이 정한다 — 여기서는 거짓 할인만 걷는다.
import { and, eq, inArray } from "drizzle-orm";
import { gamePlatforms, games, type Platform } from "@/server/db/schema";
import type { StoreAdapter, StoreSnapshot } from "@/server/adapters/types";
import type { StoreSource } from "@/server/adapters";
import { sleep } from "@/lib/async";
import { PLATFORM_SIBLING_LIMIT_BY_SOURCE, SOURCE_REGION } from "./constants";
import { recordError, type Ctx } from "./context";
import { fetchWithRetry } from "./retry";
import { resetDiscountRows } from "./ended-discounts";
import type { Fetched } from "./store-fetch";

type Offer = NonNullable<StoreSnapshot["platformProducts"]>[number];
type Want = { item: Fetched[number]; offer: Offer };

/** 맞출 짝을 고른다 — 그 게임에 그 기기 행이 이미 있는 것만. 요청이 나가는 product 만 상한으로 센다. 순수 함수라 테스트로 지킨다 */
export function pickSiblings(fetched: Fetched, existing: ReadonlySet<string>, limit: number): Want[] {
  const out: Want[] = [];
  let requests = 0;
  for (const item of fetched) {
    const gameId = item.target.gameId;
    if (!gameId) continue;
    for (const offer of item.snapshot.platformProducts ?? []) {
      if (offer.platform === item.snapshot.platform || !existing.has(`${gameId}:${offer.platform}`)) continue;
      if (offer.kind === "product") {
        if (requests >= limit) continue;
        requests++;
      }
      out.push({ item, offer });
    }
  }
  return out;
}

/** 값(상품 응답이나 본편)에서 가격 칸만 떼어 그 기기 행에 쓸 스냅샷으로 만든다. 주소, 외부 id 는 본편 것을 쓴다(행이 같은 콘셉트를 가리킨다) */
export function siblingSnapshot(main: StoreSnapshot, platform: Platform, from: StoreSnapshot): StoreSnapshot {
  return {
    platform,
    region: main.region,
    storeExternalId: main.storeExternalId,
    storeUrl: main.storeUrl,
    listPrice: from.listPrice,
    currentPrice: from.currentPrice,
    currency: from.currency,
    discountPct: from.discountPct,
    discountStartsAt: from.discountStartsAt ?? null,
    discountEndsAt: from.discountEndsAt ?? null,
  };
}

export type SiblingResult = { fetched: Fetched; absentReset: number };

/** 값을 쓸 스냅샷(product, same)을 돌려주고, absent 행의 할인은 여기서 걷는다 */
export async function fetchPlatformSiblings(ctx: Ctx, source: StoreSource, adapter: StoreAdapter, fetched: Fetched): Promise<SiblingResult> {
  const gameIds = [...new Set(fetched.filter((f) => f.target.gameId && f.snapshot.platformProducts?.length).map((f) => f.target.gameId!))];
  if (gameIds.length === 0) return { fetched: [], absentReset: 0 };
  const platforms = [...new Set(fetched.flatMap((f) => (f.snapshot.platformProducts ?? []).map((p) => p.platform)))];
  const rows = await ctx.db
    .select({
      id: gamePlatforms.id,
      gameId: gamePlatforms.gameId,
      platform: gamePlatforms.platform,
      slug: games.slug,
      listPrice: gamePlatforms.listPrice,
      discountPct: gamePlatforms.discountPct,
    })
    .from(gamePlatforms)
    .innerJoin(games, eq(games.id, gamePlatforms.gameId))
    .where(and(inArray(gamePlatforms.gameId, gameIds), inArray(gamePlatforms.platform, platforms), eq(gamePlatforms.region, SOURCE_REGION[source])));
  const rowByKey = new Map(rows.map((r) => [`${r.gameId}:${r.platform}`, r]));
  const wants = pickSiblings(fetched, new Set(rowByKey.keys()), PLATFORM_SIBLING_LIMIT_BY_SOURCE[source] ?? 0);

  const out: Fetched = [];
  const absent: Array<{ id: string; slug: string; listPrice: number | null }> = [];
  for (const { item, offer } of wants) {
    if (offer.kind === "same") {
      out.push({ target: item.target, snapshot: siblingSnapshot(item.snapshot, offer.platform, item.snapshot) });
      continue;
    }
    if (offer.kind === "absent") {
      const row = rowByKey.get(`${item.target.gameId}:${offer.platform}`);
      if (row && (row.discountPct ?? 0) > 0) absent.push(row);
      continue;
    }
    await sleep(adapter.minIntervalMs);
    try {
      const product = await fetchWithRetry(() => adapter.fetch(offer.productId));
      out.push({ target: item.target, snapshot: siblingSnapshot(item.snapshot, offer.platform, product) });
    } catch (e) {
      // 짝 하나가 실패해도 본편 값은 이미 반영됐다 — 기록만 남기고 다음 짝으로 간다
      recordError(ctx, `${source}:${offer.productId}:sibling`, e);
    }
  }
  const absentReset = absent.length > 0 ? await resetDiscountRows(ctx, absent) : 0;
  return { fetched: out, absentReset };
}
