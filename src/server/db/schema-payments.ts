// 결제 스키마(2026-10-27, docs/기획_인디홍보_상위노출멤버십_2026-10-27.md 5장 3단계, 6장 payments) — 부스트 단건 결제부터.
//
// 결제는 토스페이먼츠 결제위젯(2026-10-27 사용자 결정)이다. 흐름: 주문 줄을 pending 으로 먼저 만든다 → 결제창 → 성공 주소로 돌아오면
// 서버가 금액을 이 줄과 견준 뒤 승인 API 를 부른다 → paid 로 바꾸고 부스트를 건다(boostId). 금액을 이 줄에서 읽는 이유:
// 결제창에 넘긴 금액은 브라우저를 거쳐 오므로 바꿔치기할 수 있다. 서버가 정한 값과 다르면 승인하지 않는다.
//
// 지우지 않는다 — 결제 기록은 환불, 분쟁, 세무의 근거다. 실패한 주문도 사유와 함께 남긴다.
import { pgTable, pgEnum, uuid, text, integer, timestamp, index } from "drizzle-orm/pg-core";
import { auditColumns } from "./audit";
import { users } from "./schema";
import { promoTargetKindEnum, promotionBoosts } from "./schema-promotions";
import { memberships } from "./schema-memberships";

/** pending: 결제창에 들어감, paid: 승인 끝, failed: 결제창 실패나 승인 거절, canceled: 환불함(전액이든 일부든 — 얼마인지는 refundedAmount) */
export const paymentStatusEnum = pgEnum("payment_status", ["pending", "paid", "failed", "canceled"]);
export type PaymentStatus = (typeof paymentStatusEnum.enumValues)[number];

export const payments = pgTable("payments", {
  id: uuid("id").primaryKey().defaultRandom(),
  /** 토스에 넘기는 주문 번호. 우리가 만들고 결제창, 승인, 조회가 이 값으로 이어진다 */
  orderId: text("order_id").notNull().unique(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "restrict" }).notNull(),
  /** 상품 열쇠(lib/payments/products 의 PRODUCTS). 값이 바뀌어도 이 줄의 amount 가 그때 낸 값이다 */
  product: text("product").notNull(),
  /** 원 단위 정수(lib/currency 규칙: 최소 단위 정수) */
  amount: integer("amount").notNull(),
  status: paymentStatusEnum("status").default("pending").notNull(),
  /** 노출 자리 결제의 대상. 멤버십 청구는 대상이 없어 비운다(membershipId 를 채운다) */
  targetKind: promoTargetKindEnum("target_kind"),
  targetId: uuid("target_id"),
  /**
   * 묶음 상품(2026-10-27 사용자 확정: 인디 게임 부스트 + 홍보 글 고정 9,900원)의 둘째 대상. 종류는 상품 표가 안다(lib/payments/products 의 extra).
   * 칸을 둘로 둔 이유: 묶음은 늘 "인디 게임 하나 + 홍보 글 하나" 라 줄 표를 따로 둘 만큼 갈래가 없다
   */
  extraTargetId: uuid("extra_target_id"),
  /** 묶음의 둘째 부스트. 승인됐는데 extraTargetId 만 있고 이 칸이 비면 둘째 걸기가 실패한 것 */
  extraBoostId: uuid("extra_boost_id").references(() => promotionBoosts.id, { onDelete: "set null" }),
  /** 멤버십 청구(첫 달, 갱신)면 그 멤버십 */
  membershipId: uuid("membership_id").references(() => memberships.id, { onDelete: "set null" }),
  /** 승인 뒤 건 부스트. 승인은 됐는데 이 칸이 비면 부스트 걸기가 실패한 것 — 관리자 화면에 드러난다 */
  boostId: uuid("boost_id").references(() => promotionBoosts.id, { onDelete: "set null" }),
  /** 토스 결제 키. 조회, 취소가 이 값으로 간다 */
  paymentKey: text("payment_key"),
  method: text("method"),
  receiptUrl: text("receipt_url"),
  approvedAt: timestamp("approved_at", { withTimezone: true }),
  failCode: text("fail_code"),
  failMessage: text("fail_message"),
  /**
   * 환불(2026-10-27, 기획서 8장 "환불(전액, 일할)"). 관리자가 토스 결제 취소 API 로 돌려준 금액. 0 이면 환불 없음.
   * 일할 환불이면 amount 보다 작다 — 그래도 status 는 canceled 다: 한 결제에 환불은 한 번만 하고, 하면 노출도 그 자리에서 거둔다
   */
  refundedAmount: integer("refunded_amount").default(0).notNull(),
  refundedAt: timestamp("refunded_at", { withTimezone: true }),
  refundReason: text("refund_reason"),
  /** 사용자가 결제 내역에서 누른 환불 요청. 돈은 관리자가 확인하고 돌려준다(요청만으로 빠지지 않는다) */
  refundRequestedAt: timestamp("refund_requested_at", { withTimezone: true }),
  refundRequestNote: text("refund_request_note"),
  ...auditColumns(),
}, (t) => [index("payments_user_created_idx").on(t.userId, t.createdAt), index("payments_status_idx").on(t.status, t.createdAt)]);
