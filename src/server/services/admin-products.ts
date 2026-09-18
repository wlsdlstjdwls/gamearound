// 관리자 상품 매핑 검수 서비스 — 매장 설계서 §5.2 의 "중간" 을 사람이 마무리하는 자리.
//
// 매핑 배치는 세 갈래로 끝난다: 높으면 잇고, 중간이면 후보만 남기고, 낮으면 둔다.
// 가운데 갈래가 쌓이기만 하고 볼 자리가 없으면 그 줄들은 영영 고인다 — 이 화면이 그 출구다.
//
// 네트워크를 쓰지 않는다. 대조 상대가 우리 카탈로그이고 후보는 이미 배치가 골라 뒀다.
import "server-only";
import { and, desc, eq, isNotNull, isNull, sql } from "drizzle-orm";
import { getDb } from "@/server/db/client";
import { games, products, shops } from "@/server/db/schema";
import { updatedBy } from "@/server/db/audit";
import { linkProductToGame } from "@/server/sync/product-match";
import { requireAdmin } from "@/server/services/users";

/** 한 화면에 띄울 검수 큐 길이. 회사 검수 큐와 같은 이유로 같은 값이다 — 더 길면 사람이 훑지 못한다 */
export const PENDING_PRODUCT_MATCHES_LIMIT = 60;

export interface SuggestedProductMatch {
  productId: string;
  productName: string;
  barcode: string | null;
  hardwareCode: string | null;
  /** 이 상품을 만든 매장. 연동(CSV, POS)으로 들어온 줄은 null 이다 */
  shopName: string | null;
  confidence: string | null;
  checkedAt: Date | null;
  candidate: { id: string; slug: string; titleKo: string | null; titleEn: string };
}

/**
 * 후보만 남은 상품 목록. 이미 게임을 단 상품은 제외한다 —
 * 배치가 이은 뒤에도 후보 칸이 남아 있는 행은 없지만, 조건을 걸어 두어야 관리자가
 * 이미 끝난 줄을 다시 판정하는 일이 안 생긴다.
 */
export async function listSuggestedProductMatches(
  limit: number = PENDING_PRODUCT_MATCHES_LIMIT,
): Promise<SuggestedProductMatch[]> {
  await requireAdmin();
  const rows = await getDb()
    .select({
      productId: products.id,
      productName: products.name,
      barcode: products.barcode,
      hardwareCode: products.hardwareCode,
      shopName: shops.name,
      confidence: products.gameMatchConfidence,
      checkedAt: products.gameMatchCheckedAt,
      gameId: games.id,
      slug: games.slug,
      titleKo: games.titleKo,
      titleEn: games.titleEn,
    })
    .from(products)
    .innerJoin(games, eq(games.id, products.gameMatchSuggestedId))
    .leftJoin(shops, eq(shops.id, products.registeredShopId))
    .where(and(isNull(products.gameId), isNotNull(products.gameMatchSuggestedId)))
    .orderBy(desc(products.gameMatchConfidence))
    .limit(limit);

  return rows.map((r) => ({
    productId: r.productId,
    productName: r.productName,
    barcode: r.barcode,
    hardwareCode: r.hardwareCode,
    shopName: r.shopName,
    confidence: r.confidence,
    checkedAt: r.checkedAt,
    candidate: { id: r.gameId, slug: r.slug, titleKo: r.titleKo, titleEn: r.titleEn },
  }));
}

/**
 * 승인: 후보를 그대로 잇는다. 구성품 한 줄까지 남기는 일은 배치와 같은 함수가 한다
 * (sync/product-match 의 `linkProductToGame`).
 *
 * 게임 상세를 캐시 무효화하지 않는 이유: 매장, 재고 데이터에는 캐시를 걸지 않는다.
 * "파는 곳" 은 매 요청 질의한다 — 재고가 한 개 남은 화면이 캐시로 굳으면 헛걸음이 된다.
 */
export async function approveProductMatch(productId: string): Promise<{ gameSlug: string }> {
  const admin = await requireAdmin();
  const [row] = await getDb()
    .select({
      suggestedId: products.gameMatchSuggestedId,
      confidence: products.gameMatchConfidence,
      slug: games.slug,
    })
    .from(products)
    .innerJoin(games, eq(games.id, products.gameMatchSuggestedId))
    .where(and(eq(products.id, productId), isNull(products.gameId)))
    .limit(1);
  if (!row?.suggestedId) throw new Error("검수할 후보가 없습니다");

  await linkProductToGame(
    productId,
    row.suggestedId,
    { source: "admin", userId: admin.id },
    row.confidence === null ? null : Number(row.confidence),
  );
  return { gameSlug: row.slug };
}

/**
 * 거절: 후보 칸을 비우되 **무엇을 물렀는지는 남긴다**.
 *
 * 배치는 이레마다(PRODUCT_MATCH_RECHECK_DAYS) 같은 카탈로그를 다시 견준다. 기록 없이 비우면
 * 다음 회차가 같은 후보를 같은 자리에 다시 올려 사람이 거절할수록 큐가 그대로 차는 쳇바퀴가 된다.
 * 물린 후보를 남겨 두면 배치가 그 하나를 건너뛰고 그다음 후보를 본다.
 *
 * `checked_at` 을 지금으로 찍는 이유도 같다 — 안 찍으면 이 상품이 내일 큐 선두로 돌아온다.
 */
export async function rejectProductMatch(productId: string): Promise<void> {
  const admin = await requireAdmin();
  const rows = await getDb()
    .update(products)
    .set({
      gameMatchRejectedId: sql`${products.gameMatchSuggestedId}`,
      gameMatchSuggestedId: null,
      gameMatchConfidence: null,
      gameMatchCheckedAt: new Date(),
      ...updatedBy("admin", admin.id),
    })
    .where(and(eq(products.id, productId), isNotNull(products.gameMatchSuggestedId)))
    .returning({ id: products.id });
  if (rows.length === 0) throw new Error("검수할 후보가 없습니다");
}
