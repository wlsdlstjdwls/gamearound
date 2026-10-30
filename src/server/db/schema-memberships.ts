// 메이커 멤버십(2026-10-27, docs/기획_인디홍보_상위노출멤버십_2026-10-27.md 4.3, 8장 "월 정기결제 빌링키, 결제 실패 재시도, 해지 시 기간 끝까지 유지").
//
// 한 사람에 한 줄이다(user_id unique). 끝난 멤버십을 다시 시작하면 같은 줄을 새 기간으로 덮는다 — 지난 기간의 근거는 payments 줄들이 남긴다.
// 상태: active(이용 중, 기간 끝에 다음 달을 청구), canceling(해지 예약, 기간 끝까지 쓰고 청구 없이 끝남),
// past_due(갱신 청구 실패, 하루 간격으로 다시 청구), ended(끝남).
//
// 빌링키는 토스가 카드 대신 내주는 열쇠다. 우리 비밀 키 없이는 쓸 수 없지만 화면, 로그, DTO 로는 내보내지 않는다(services/membership 만 읽는다).
// 끝나면 지운다 — 다시 시작하면 카드를 새로 등록한다.
import { pgTable, pgEnum, uuid, text, integer, timestamp, index } from "drizzle-orm/pg-core";
import { auditColumns } from "./audit";
import { users } from "./schema";

export const membershipStatusEnum = pgEnum("membership_status", ["active", "canceling", "past_due", "ended"]);
export type MembershipStatus = (typeof membershipStatusEnum.enumValues)[number];

export const memberships = pgTable("memberships", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "restrict" }).notNull().unique(),
  /** 요금제 열쇠(lib/membership/plan). 값이 바뀌어도 그달 낸 금액은 payments 줄이 안다 */
  plan: text("plan").notNull(),
  status: membershipStatusEnum("status").notNull(),
  billingKey: text("billing_key"),
  /** 토스 customerKey. 우리 사용자 id 와 같다 — 빌링키는 이 값과 짝으로만 청구된다 */
  customerKey: text("customer_key").notNull(),
  /** 등록한 카드 표시(카드사와 가린 번호). 내 멤버십 화면에 "어느 카드로 나가는지" 를 보여 준다 */
  cardLabel: text("card_label"),
  currentPeriodStart: timestamp("current_period_start", { withTimezone: true }).notNull(),
  currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }).notNull(),
  /** 이번 기간에 남은 부스트 이용권. 갱신될 때마다 요금제 수만큼 다시 찬다(남은 것은 넘기지 않는다) */
  boostCredits: integer("boost_credits").default(0).notNull(),
  /** 다음 청구 시각. active 면 기간 끝, past_due 면 다음 재시도. canceling, ended 는 비운다 */
  nextChargeAt: timestamp("next_charge_at", { withTimezone: true }),
  /** 잇달아 실패한 갱신 청구 수. 성공하면 0 */
  failedAttempts: integer("failed_attempts").default(0).notNull(),
  lastFailMessage: text("last_fail_message"),
  /**
   * 가입 때 받은 프로모션(2026-10-30, lib/pricing/promo-terms). 첫 청구에 걸린 프로모션의 id, 노출명, 할인가, 개월(0 = 매달 계속)을 받아 두고
   * 이 할인으로 낸 월 결제 수(promoPaid)를 센다. 갱신 청구는 요금 설정이 아니라 이 값으로 매긴다 — 관리자가 프로모션을 바꾸거나 신규만 중지해도
   * 가입 때 약속이 지켜진다. 다 쓰거나 "기존 회원도 중지" 로 거두면 비운다. 받은 혜택이 없으면 모두 null
   */
  promoId: text("promo_id"),
  promoLabel: text("promo_label"),
  promoAmount: integer("promo_amount"),
  promoMonths: integer("promo_months"),
  promoPaid: integer("promo_paid"),
  canceledAt: timestamp("canceled_at", { withTimezone: true }),
  endedAt: timestamp("ended_at", { withTimezone: true }),
  ...auditColumns(),
}, (t) => [index("memberships_charge_idx").on(t.status, t.nextChargeAt)]);
