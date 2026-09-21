// 관리자 메뉴에 붙일 "남은 일" 수. 메뉴가 곧 할 일 목록이 되게 하는 값이다 —
// 어느 검수 화면에 줄이 쌓였는지 들어가 보지 않고 알 수 있어야 관리자가 화면을 헤매지 않는다.
//
// 네 값을 한 묶음(Promise.all)으로 센다. 줄 세우면 왕복이 그대로 쌓이고, 이 값들은
// 본문이 아니라 메뉴에 붙으므로 본문보다 느려지면 안 된다(§Neon 왕복 비용).
//
// 회사 검수만 정확한 수가 아니라 상한(limit)까지 센 값이다 — 그 큐는 게임을 훑어 이름으로 묶는
// 계산이라 전수를 세려면 카탈로그 전체를 훑어야 하고, 화면도 같은 상한까지만 보여 준다.
import "server-only";
import { and, count, eq, isNotNull, isNull } from "drizzle-orm";
import { getDb } from "@/server/db/client";
import { gameSourceRefs } from "@/server/db/schema";
import { products } from "@/server/db/schema-products";
import { shops } from "@/server/db/schema-shops";
import { listPendingCompanies, PENDING_COMPANIES_LIMIT } from "@/server/services/admin-companies";
import { requireAdmin } from "@/server/services/users";

export interface AdminWorkCounts {
  /** 유사도 중간대라 사람이 판정해야 하는 스토어 매칭 */
  matches: number;
  /** 후보만 달린 매장 상품 */
  products: number;
  /** 심사 대기 매장 */
  shops: number;
  /** 확정 못 한 회사 이름. PENDING_COMPANIES_LIMIT 까지만 센다 */
  companies: number;
  /** companies 가 상한에 닿아 "이상"으로 읽어야 하는지 */
  companiesCapped: boolean;
}

export async function getAdminWorkCounts(): Promise<AdminWorkCounts> {
  await requireAdmin();
  const db = getDb();

  const [[matches], [pendingProducts], [pendingShops], companies] = await Promise.all([
    db.select({ n: count() }).from(gameSourceRefs).where(eq(gameSourceRefs.matchedBy, "pending")),
    db
      .select({ n: count() })
      .from(products)
      .where(and(isNull(products.gameId), isNotNull(products.gameMatchSuggestedId))),
    db.select({ n: count() }).from(shops).where(eq(shops.status, "pending")),
    listPendingCompanies(),
  ]);

  return {
    matches: matches?.n ?? 0,
    products: pendingProducts?.n ?? 0,
    shops: pendingShops?.n ?? 0,
    companies: companies.length,
    companiesCapped: companies.length >= PENDING_COMPANIES_LIMIT,
  };
}
