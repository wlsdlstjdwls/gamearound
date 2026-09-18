// 상품과 게임을 잇는 주기 배치 — 매장 설계서 §5.2.
//
// 매장이 등록할 때 게임을 고르는 것이 본줄기고(§5.1) 이 배치는 그 그물을 빠져나간 것을 줍는다.
// 빠져나가는 길은 셋이다: 매장이 안 고르고 올렸다, 고를 때는 카탈로그에 없었다, 연동(CSV, POS)으로
// 들어와 고를 사람이 없었다. 셋 다 시간이 지나면 저절로 이어질 수 있는 것들이라 주기로 다시 본다.
//
// 네트워크를 쓰지 않는다 — 대조 상대가 우리 카탈로그다. 그래서 스토어 크론이 아니라
// 하루 한 번 도는 정리 크론(api/cron/daily)에 얹었다.
import { and, eq, isNull, or, sql } from "drizzle-orm";
import { getDb } from "@/server/db/client";
import { games, productComponents, products } from "@/server/db/schema";
import { createdBy, updatedBy, type AuditSource } from "@/server/db/audit";
import { normalizeForSearch } from "@/lib/slug";
import { AUTO_MATCH_THRESHOLD, PENDING_MATCH_THRESHOLD } from "./match";
import { PRODUCT_MATCH_CANDIDATES, PRODUCT_MATCH_RECHECK_DAYS } from "./constants";

export interface ProductMatchSummary {
  attempted: number;
  linked: number;
  suggested: number;
  unmatched: number;
}

/** 다시 볼 때가 된 시점. 이 값보다 오래전에 본 상품만 큐에 다시 선다 */
function recheckCutoff(): Date {
  return new Date(Date.now() - PRODUCT_MATCH_RECHECK_DAYS * 24 * 60 * 60 * 1000);
}

/**
 * 후보 한 줄. 유사도는 DB 의 trigram 이 낸다 — 카탈로그 7만 행을 JS 로 끌어와 견줄 수는 없다.
 * 스토어 매칭(sync/match)이 JS 로 견주는 것은 후보가 스토어 검색 결과 열댓 건이라서다.
 */
type Candidate = { id: string; similarity: number };

async function findCandidates(name: string): Promise<Candidate[]> {
  const norm = normalizeForSearch(name);
  if (!norm) return [];
  // 수집 제외 행(레트로)도 후보로 둔다 — 매장이 파는 물건이 바로 그것이다.
  // 여기서 빼면 슈퍼패미컴 상품은 영원히 게임을 못 단다(§5.3 의 제외와 방향이 반대인 자리다).
  const rows = await getDb()
    .select({
      id: games.id,
      similarity: sql<number>`greatest(
        similarity(${games.titleEnNorm}, ${norm}),
        similarity(${games.titleKoNorm}, ${norm})
      )`,
    })
    .from(games)
    .where(
      and(
        eq(games.contentType, "game"),
        or(sql`${games.titleEnNorm} % ${norm}`, sql`${games.titleKoNorm} % ${norm}`),
      ),
    )
    .orderBy(sql`2 desc`)
    .limit(PRODUCT_MATCH_CANDIDATES);
  return rows.map((r) => ({ id: r.id, similarity: Number(r.similarity) }));
}

/**
 * 게임을 못 단 상품을 카탈로그와 대조한다.
 *
 * 높으면 잇고, 중간이면 후보만 남겨 관리자가 보게 하고, 낮으면 그대로 둔다 —
 * **상품은 gameId 없이도 팔린다**(§5.2). 못 이었다고 해서 판매가 멈추는 자리가 아니다.
 *
 * 어느 갈래로 끝나든 `gameMatchCheckedAt` 을 찍는다. 안 찍으면 다음 회차가 같은 행을 또 집고
 * 뒤에 선 상품은 영영 차례를 못 받는다 — 매칭 큐가 머리에서 막히는 고전적인 모양이다.
 */
export async function matchUnlinkedProducts(limit: number): Promise<ProductMatchSummary> {
  const db = getDb();
  const rows = await db
    .select({ id: products.id, name: products.name, rejectedId: products.gameMatchRejectedId })
    .from(products)
    .where(
      and(
        isNull(products.gameId),
        or(isNull(products.gameMatchCheckedAt), sql`${products.gameMatchCheckedAt} < ${recheckCutoff()}`),
      ),
    )
    .orderBy(sql`${products.gameMatchCheckedAt} asc nulls first`)
    .limit(limit);

  const summary: ProductMatchSummary = { attempted: 0, linked: 0, suggested: 0, unmatched: 0 };
  for (const row of rows) {
    summary.attempted++;
    // 관리자가 물린 후보는 건너뛰고 그다음을 본다. 그대로 다시 집으면 사람이 거절할수록
    // 같은 줄이 검수 큐에 다시 쌓인다 — 거절을 기록으로 남긴 이유가 이것이다(§5.2)
    const best = (await findCandidates(row.name)).find((c) => c.id !== row.rejectedId);
    const now = new Date();

    if (best && best.similarity >= AUTO_MATCH_THRESHOLD) {
      await linkProductToGame(row.id, best.id, { source: "cron:product-match" }, best.similarity, now);
      summary.linked++;
    } else if (best && best.similarity >= PENDING_MATCH_THRESHOLD) {
      await db
        .update(products)
        .set({
          gameMatchSuggestedId: best.id,
          gameMatchConfidence: best.similarity.toFixed(2),
          gameMatchCheckedAt: now,
          ...updatedBy("cron:product-match"),
        })
        .where(eq(products.id, row.id));
      summary.suggested++;
    } else {
      await db
        .update(products)
        .set({ gameMatchCheckedAt: now, ...updatedBy("cron:product-match") })
        .where(eq(products.id, row.id));
      summary.unmatched++;
    }
  }
  return summary;
}

/**
 * 상품에 게임을 잇는다. 구성품 한 줄을 같이 남기는 것이 핵심이다 —
 * 게임 상세의 "파는 곳" 은 `products.gameId` 가 아니라 `product_components.gameId` 를 본다(§4).
 * 여기서 안 남기면 상품은 게임을 가리키는데 그 게임 화면에는 안 뜨는 조용한 어긋남이 생긴다.
 *
 * 배치와 관리자 검수(services/admin-products)가 같은 함수를 쓴다. 두 벌로 두면 한쪽만
 * 구성품을 남기는 날이 오고, 그날의 증상은 "이었다는데 화면에 안 뜬다" 라 원인을 찾기 어렵다.
 */
export async function linkProductToGame(
  productId: string,
  gameId: string,
  actor: { source: AuditSource; userId?: string },
  confidence: number | null,
  now: Date = new Date(),
): Promise<void> {
  const db = getDb();
  await db
    .update(products)
    .set({
      gameId,
      gameMatchSuggestedId: null,
      gameMatchConfidence: confidence === null ? null : confidence.toFixed(2),
      gameMatchCheckedAt: now,
      ...updatedBy(actor.source, actor.userId),
    })
    .where(eq(products.id, productId));
  // 같은 줄이 이미 있으면 그대로 둔다 — 부분 unique 인덱스(product_components_game_uq)가 받는다
  await db
    .insert(productComponents)
    .values({ productId, kind: "game", gameId, ...createdBy(actor.source, actor.userId) })
    .onConflictDoNothing();
}
