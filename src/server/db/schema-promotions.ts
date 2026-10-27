// 유료 노출 자리 스키마(2026-10-27, docs/기획_인디홍보_상위노출멤버십_2026-10-27.md 4장, 5장 2단계) — "이 글을 이 자리에 언제까지 세운다".
//
// 결제보다 먼저 만든다: 2단계는 관리자가 직접 걸어 주며(source admin) 효과를 잰다. 결제가 붙으면 같은 표에 source purchase,
// 멤버십이면 membership 으로 쌓인다 — 노출하는 쪽은 출처를 보지 않는다.
//
// 대상은 두 표(indie_posts, posts)에 걸쳐 외래키를 못 건다. 대상이 지워지면 줄은 남고 노출 질의가 대상 표와 join 하며 저절로 빠진다.
// 숨김, 반려된 대상도 같은 join 의 공개 조건에서 빠진다(기획서 4.1 "돈을 냈어도 반려, 숨김 상태면 노출하지 않는다").
// 회수는 지우지 않고 revokedAt 을 찍는다 — 결제가 붙으면 환불 근거가 이 줄이다.
import { pgTable, pgEnum, uuid, text, timestamp, index } from "drizzle-orm/pg-core";
import { auditColumns } from "./audit";

/** 노출 대상의 표. 자리마다 정해진 하나만 받는다(lib/promo/boost 의 SLOT_TARGET) */
export const promoTargetKindEnum = pgEnum("promo_target_kind", ["indie_post", "board_post"]);
/** 파는 자리. indie_top: 인디 목록 맨 위 "주목할 게임", promo_pin: 게시판 홍보 목록 위 고정 */
export const promoSlotEnum = pgEnum("promo_slot", ["indie_top", "promo_pin"]);
/** 누가 걸었나. 2단계는 admin 뿐이다 */
export const promoSourceEnum = pgEnum("promo_source", ["admin", "purchase", "membership"]);

export type PromoSlot = (typeof promoSlotEnum.enumValues)[number];
export type PromoTargetKind = (typeof promoTargetKindEnum.enumValues)[number];
export type PromoSource = (typeof promoSourceEnum.enumValues)[number];

export const promotionBoosts = pgTable("promotion_boosts", {
  id: uuid("id").primaryKey().defaultRandom(),
  targetKind: promoTargetKindEnum("target_kind").notNull(),
  targetId: uuid("target_id").notNull(),
  slot: promoSlotEnum("slot").notNull(),
  startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
  endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
  source: promoSourceEnum("source").notNull(),
  /** 관리자가 남기는 한 줄(시범 대상, 협의 내용) */
  note: text("note"),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
  ...auditColumns(),
}, (t) => [
  // 노출 질의는 "이 자리에서 지금 걸린 것" 을 본다
  index("promotion_boosts_slot_ends_idx").on(t.slot, t.endsAt),
  index("promotion_boosts_target_idx").on(t.targetKind, t.targetId),
]);
