// 관리자 메뉴에 붙일 "남은 일" 수. 메뉴가 곧 할 일 목록이 되게 하는 값이다 —
// 어느 검수 화면에 줄이 쌓였는지 들어가 보지 않고 알 수 있어야 관리자가 화면을 헤매지 않는다.
//
// 값들을 한 묶음(Promise.all)으로 센다. 줄 세우면 왕복이 그대로 쌓이고, 이 값들은
// 본문이 아니라 메뉴에 붙으므로 본문보다 느려지면 안 된다(§Neon 왕복 비용).
//
// 레이아웃(메뉴 배지)과 첫 화면(업무 현황판)이 같은 요청 안에서 같은 수를 쓴다 — React cache 로 한 번만 센다.
//
// 회사 검수만 정확한 수가 아니라 상한(limit)까지 센 대략의 값이다 — 그 큐는 게임을 훑어 이름으로 묶는
// 계산이라 정확히 세려면 카탈로그를 통째로 받아야 한다. 배지는 (개발사, 배급사) 표기 조합 수로 대신 센다.
import "server-only";
import { cache } from "react";
import { and, count, eq, gt, inArray, isNotNull, isNull, lte, sql } from "drizzle-orm";
import { getDb } from "@/server/db/client";
import { adminTasks, gameSourceRefs } from "@/server/db/schema";
import { products } from "@/server/db/schema-products";
import { shops } from "@/server/db/schema-shops";
import { PENDING_COMPANIES_LIMIT } from "@/server/services/admin-companies";
import { countPendingCompanyGroups } from "@/server/sync/run-companies";
import { countIndieAdminQueue, countIndieQueues } from "@/server/services/indie";
import { countCommunityToday } from "@/server/services/community";
import { countPreorderReview } from "@/server/services/preorder-bonuses";
import { countOpenDataIssues } from "@/server/services/admin-data-issues";
import { requireAdmin } from "@/server/services/users";
import { memberships } from "@/server/db/schema-memberships";
import { promotionBoosts } from "@/server/db/schema-promotions";
import { getPaymentSummaryForAdmin } from "@/server/services/payments";
import { getSyncOverview } from "@/server/services/admin";
import { RUNNING_GRACE_MINUTES } from "@/server/services/admin-activity";
import { getDisabledReason, isSource } from "@/server/adapters";
import { SYNC_ATTENTION, syncHealthOf } from "@/lib/admin/sync-health";

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
  /** 데이터 점검기가 사람에게 물은 것(sync/quality) */
  dataIssues: number;
}

export const getAdminWorkCounts = cache(async (): Promise<AdminWorkCounts> => {
  await requireAdmin();
  const db = getDb();

  const [[matches], [pendingProducts], [pendingShops], companies, taskRows, indie, preorder, dataIssues] = await Promise.all([
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
    countOpenDataIssues(),
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
    dataIssues,
  };
});

/** 곧 끝나는 광고로 세는 범위. 연장을 권하거나 다음 자리를 채울 시간이 있어야 해서 하루가 아니라 사흘이다 */
export const PROMO_ENDING_SOON_DAYS = 3;

/**
 * 관리자 첫 화면(/admin) 업무 현황판의 숫자. 메뉴 묶음(수익, 운영, 수집, 검수, 커뮤니티, 매장)마다 쌓인 일과 훑어볼 양을 센다.
 *
 * 왜 묶음마다 다 세나(2026-10-29, 사용자 "관리자 화면이 어렵다" + 신세계TV 백오피스 첫 화면 참고): 앞 첫 화면은 수집 현황 표에
 * 칸 일곱만 얹혀 있어 환불 요청, 결제 실패, 데이터 점검처럼 메뉴 배지도 없는 일은 화면을 하나씩 열어 봐야 알았다.
 * 백오피스는 첫 화면이 업무 단계별 건수판이고 숫자를 누르면 그 일로 간다 — 첫 화면에서 "오늘 무엇을 할지" 가 끝난다.
 */
export interface AdminBoard {
  /** 센 시각(ms). 화면 머리에 "기준" 으로 선다 */
  asOf: number;
  refundRequests: number;
  boostMissing: number;
  monthPaid: number;
  membershipsPastDue: number;
  promosEndingSoon: number;
  tasksTodo: number;
  tasksDoing: number;
  /** 지금 손봐야 하는 스토어(끊김, 실패, 일부 실패). 규칙은 수집 현황 표와 같다(lib/admin/sync-health) */
  sourcesAttention: number;
  failedRunsToday: number;
  matches: number;
  dataIssues: number;
  companies: number;
  companiesCapped: boolean;
  preorder: number;
  indieReview: number;
  indieReported: number;
  indieLinks: number;
  /** 오늘(한국 날짜) 새로 올라온 게시판, 라운지 글과 댓글. 쌓인 일이 아니라 훑어볼 양이다 */
  postsToday: number;
  commentsToday: number;
  shops: number;
  products: number;
}

export async function getAdminBoard(): Promise<AdminBoard> {
  await requireAdmin();
  const db = getDb();
  const now = Date.now();
  // 한 묶음으로 던진다 — 줄 세우면 왕복이 그대로 쌓인다(Neon 왕복 비용). 메뉴 배지와 같은 값은 getAdminWorkCounts 의 cache 를 탄다
  const [work, indie, community, pay, sync, [pastDue], [ending]] = await Promise.all([
    getAdminWorkCounts(),
    countIndieQueues(),
    countCommunityToday(),
    getPaymentSummaryForAdmin(),
    getSyncOverview(),
    db.select({ n: count() }).from(memberships).where(eq(memberships.status, "past_due")),
    db
      .select({ n: count() })
      .from(promotionBoosts)
      .where(
        and(
          isNull(promotionBoosts.revokedAt),
          lte(promotionBoosts.startsAt, sql`now()`),
          gt(promotionBoosts.endsAt, sql`now()`),
          lte(promotionBoosts.endsAt, sql`now() + make_interval(days => ${PROMO_ENDING_SOON_DAYS}::int)`),
        ),
      ),
  ]);
  const health = sync.items.map((it) => syncHealthOf(it.latest, isSource(it.source) && Boolean(getDisabledReason(it.source)), now, RUNNING_GRACE_MINUTES));

  return {
    asOf: now,
    refundRequests: pay.refundRequests,
    boostMissing: pay.boostMissing,
    monthPaid: pay.monthPaid,
    membershipsPastDue: pastDue?.n ?? 0,
    promosEndingSoon: ending?.n ?? 0,
    tasksTodo: work.tasksTodo,
    tasksDoing: work.tasksDoing,
    sourcesAttention: health.filter((h) => SYNC_ATTENTION.includes(h)).length,
    failedRunsToday: sync.items.reduce((n, it) => n + it.failedToday, 0),
    matches: work.matches,
    dataIssues: work.dataIssues,
    companies: work.companies,
    companiesCapped: work.companiesCapped,
    preorder: work.preorder,
    indieReview: indie.review,
    indieReported: indie.reported,
    indieLinks: indie.links,
    postsToday: community.posts,
    commentsToday: community.comments,
    shops: work.shops,
    products: work.products,
  };
}
