// 매장 도메인 스키마 — 설계서 `docs/기획_매장_상품관리_회원_2026-09-17.md` §3, §9.
//
// 왜 파일을 가르나: schema.ts 는 이미 600줄이 넘는다(AGENTS §4). 매장은 수집 카탈로그와
// 사는 세계가 다르다 — 크롤러가 절대 건드리지 않고, 사람만 쓴다. 호출부는 schema.ts 가
// 그대로 재수출하므로 import 경로는 바뀌지 않는다.
//
// 왜 `store_` 가 아니라 `shop_` 인가: 이 레포에서 `store` 는 이미 디지털 스토어다
// (`StoreSnapshot`, `storeUrl` 이 스팀, PS 상품을 가리킨다). 오프라인 매장에 같은 낱말을 쓰면
// 코드를 읽을 때마다 어느 쪽인지 되묻게 된다.
import { pgTable, pgEnum, uuid, text, integer, numeric, timestamp, index, uniqueIndex, primaryKey } from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";
import { auditColumns } from "./audit";
import { users } from "./schema";

/**
 * 사업자 매장과 개인 판매자를 한 표에 담는다.
 * 중고거래를 열 때 하는 일은 `personal` 행을 허용하는 것뿐이다 — 주문, 정산, 평판은 같은 길을 탄다.
 */
export const shopTypeEnum = pgEnum("shop_type", ["business", "personal"]);
export const shopStatusEnum = pgEnum("shop_status", ["pending", "active", "suspended"]);
/** 오프라인 매장만 좌표가 필수다. 개인 판매자는 주소가 아예 없다 */
export const shopAddressTypeEnum = pgEnum("shop_address_type", ["offline", "online_only", "none"]);
export const shopStaffRoleEnum = pgEnum("shop_staff_role", ["owner", "manager", "staff"]);

/** 화면과 서비스가 문자열 리터럴 대신 쓰는 이름 — enum 값이 늘면 여기가 따라 넓어진다 */
export type ShopStatus = (typeof shopStatusEnum.enumValues)[number];
export type ShopType = (typeof shopTypeEnum.enumValues)[number];

export const shops = pgTable("shops", {
  id: uuid("id").primaryKey().defaultRandom(),
  shopType: shopTypeEnum("shop_type").default("business").notNull(),
  /** 공개 주소 `/shops/[slug]`. 예약어는 ROUTES.reservedShopSlugs 가 막는다 */
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  /** 대표 계정. 실제 권한은 shop_staff 가 정한다 — 여기만 보고 권한을 판단하지 않는다 */
  ownerUserId: uuid("owner_user_id").references(() => users.id).notNull(),
  /** 사업자등록번호. shop_type 이 personal 이면 null */
  bizRegNo: text("biz_reg_no"),
  addressType: shopAddressTypeEnum("address_type").default("offline").notNull(),
  address: text("address"),
  addressDetail: text("address_detail"),
  postalCode: text("postal_code"),
  // 거리 정렬용. 소수 6자리면 약 0.1m 분해능이라 매장 위치에 충분하다
  lat: numeric("lat", { precision: 9, scale: 6 }),
  lng: numeric("lng", { precision: 9, scale: 6 }),
  phone: text("phone"),
  /** 영업시간. 요일별 구조화는 화면이 생긴 뒤에 정한다 — 지금 모양을 지어내면 두 번 고친다 */
  hours: text("hours"),
  description: text("description"),
  status: shopStatusEnum("status").default("pending").notNull(),
  /** 반려, 정지 사유. 관리자 화면과 매장주 화면에 그대로 뜬다 */
  statusReason: text("status_reason"),
  approvedAt: timestamp("approved_at", { withTimezone: true }),
  approvedBy: uuid("approved_by").references(() => users.id),
  ratingAvg: numeric("rating_avg", { precision: 3, scale: 2 }),
  ratingCount: integer("rating_count").default(0).notNull(),
  ...auditColumns(),
}, (t) => [
  // 공개 목록은 active 만 본다. 관리자 심사 화면은 pending 만 본다 — 둘 다 이 인덱스를 탄다
  index("shops_status_idx").on(t.status),
  index("shops_owner_idx").on(t.ownerUserId),
]);

/**
 * 매장 직원 계정.
 *
 * 1인 매장이면 행이 하나뿐이지만 표를 없애지 않는다 — 계정을 공유하는 순간
 * 감사 컬럼의 `updated_by` 가 전부 같은 사람이 되고 "누가 재고를 0으로 내렸나" 에 답할 수 없다.
 */
export const shopStaff = pgTable("shop_staff", {
  shopId: uuid("shop_id").references(() => shops.id, { onDelete: "cascade" }).notNull(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  role: shopStaffRoleEnum("role").default("staff").notNull(),
  invitedBy: uuid("invited_by").references(() => users.id),
  joinedAt: timestamp("joined_at", { withTimezone: true }).defaultNow().notNull(),
  ...auditColumns(),
}, (t) => [
  primaryKey({ columns: [t.shopId, t.userId] }),
  // "내가 속한 매장" 은 로그인할 때마다 묻는 질문이다
  index("shop_staff_user_idx").on(t.userId),
]);

/**
 * 직원 초대. 매장마다 로그인을 따로 만들지 않는 이유가 이 표다 —
 * 가입은 하나로 두고, 매장 소속은 초대를 받아들일 때 붙는다.
 */
export const shopStaffInvites = pgTable("shop_staff_invites", {
  id: uuid("id").primaryKey().defaultRandom(),
  shopId: uuid("shop_id").references(() => shops.id, { onDelete: "cascade" }).notNull(),
  email: text("email").notNull(),
  role: shopStaffRoleEnum("role").default("staff").notNull(),
  /** 메일로 보낸 토큰의 sha256. 원문은 저장하지 않는다 — sessions 와 같은 규칙 */
  tokenHash: text("token_hash").notNull().unique(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  acceptedAt: timestamp("accepted_at", { withTimezone: true }),
  acceptedUserId: uuid("accepted_user_id").references(() => users.id),
  ...auditColumns(),
}, (t) => [
  index("shop_staff_invites_shop_idx").on(t.shopId),
  // 같은 매장에 같은 주소로 살아 있는 초대가 둘일 이유가 없다. 수락, 만료된 행은 걸리지 않게 부분 인덱스로 둔다
  uniqueIndex("shop_staff_invites_open_uq").on(t.shopId, t.email).where(sql`accepted_at is null`),
]);

export const shopsRelations = relations(shops, ({ one, many }) => ({
  owner: one(users, { fields: [shops.ownerUserId], references: [users.id] }),
  staff: many(shopStaff),
  invites: many(shopStaffInvites),
}));

export const shopStaffRelations = relations(shopStaff, ({ one }) => ({
  shop: one(shops, { fields: [shopStaff.shopId], references: [shops.id] }),
  user: one(users, { fields: [shopStaff.userId], references: [users.id] }),
}));

export const shopStaffInvitesRelations = relations(shopStaffInvites, ({ one }) => ({
  shop: one(shops, { fields: [shopStaffInvites.shopId], references: [shops.id] }),
}));
