// 관리자 메뉴에 붙일 "남은 일" 수. 메뉴가 곧 할 일 목록이 되게 하는 값이다 —
// 어느 검수 화면에 줄이 쌓였는지 들어가 보지 않고 알 수 있어야 관리자가 화면을 헤매지 않는다.
//
// 값들을 한 묶음(Promise.all)으로 센다. 줄 세우면 왕복이 그대로 쌓이고, 이 값들은
// 본문이 아니라 메뉴에 붙으므로 본문보다 느려지면 안 된다(§Neon 왕복 비용).
//
// 회사 검수만 정확한 수가 아니라 상한(limit)까지 센 대략의 값이다 — 그 큐는 게임을 훑어 이름으로 묶는
// 계산이라 정확히 세려면 카탈로그를 통째로 받아야 한다. 배지는 (개발사, 배급사) 표기 조합 수로 대신 센다.
import "server-only";
import { and, count, eq, inArray, isNotNull, isNull } from "drizzle-orm";
import { getDb } from "@/server/db/client";
import { adminTasks, gameSourceRefs } from "@/server/db/schema";
import { products } from "@/server/db/schema-products";
import { shops } from "@/server/db/schema-shops";
import { PENDING_COMPANIES_LIMIT } from "@/server/services/admin-companies";
import { countPendingCompanyGroups } from "@/server/sync/run-companies";
import { countIndieAdminQueue } from "@/server/services/indie";
import { countPreorderReview } from "@/server/services/preorder-bonuses";
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
  /**
   * 할 일 판의 "할 일" 칸과 "하는 중" 칸 건수(2026-09-30, 사용자 요청).
   * 언젠가(backlog)와 끝(done)은 세지 않는다 — 메뉴 배지는 "지금 손댈 것" 만 말해야 한다.
   * 언젠가까지 세면 숫자가 늘 커서 아무도 안 본다.
   */
  tasksTodo: number;
  tasksDoing: number;
  /** 신고가 쌓인 공개 인디 글 + 게임 연결 확인 대기 */
  indie: number;
  /** 검토 대기 예약 특전 글(게임을 못 이었거나 특전을 못 뽑았다) */
  preorder: number;
}

export async function getAdminWorkCounts(): Promise<AdminWorkCounts> {
  await requireAdmin();
  const db = getDb();

  const [[matches], [pendingProducts], [pendingShops], companies, taskRows, indie, preorder] = await Promise.all([
    db.select({ n: count() }).from(gameSourceRefs).where(eq(gameSourceRefs.matchedBy, "pending")),
    db
      .select({ n: count() })
      .from(products)
      .where(and(isNull(products.gameId), isNotNull(products.gameMatchSuggestedId))),
    db.select({ n: count() }).from(shops).where(eq(shops.status, "pending")),
    countPendingCompanyGroups(db, PENDING_COMPANIES_LIMIT),
    // 두 칸을 한 질의로 센다 — 칸마다 물으면 왕복이 하나 더 붙는다
    db
      .select({ status: adminTasks.status, n: count() })
      .from(adminTasks)
      .where(inArray(adminTasks.status, ["todo", "doing"]))
      .groupBy(adminTasks.status),
    countIndieAdminQueue(),
    countPreorderReview(),
  ]);
  const tasksOf = (s: "todo" | "doing") => taskRows.find((r) => r.status === s)?.n ?? 0;

  return {
    matches: matches?.n ?? 0,
    products: pendingProducts?.n ?? 0,
    shops: pendingShops?.n ?? 0,
    companies,
    companiesCapped: companies >= PENDING_COMPANIES_LIMIT,
    tasksTodo: tasksOf("todo"),
    tasksDoing: tasksOf("doing"),
    indie,
    preorder,
  };
}
