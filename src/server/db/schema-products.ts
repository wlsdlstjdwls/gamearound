// 상품, 재고 스키마 — 설계서 `docs/기획_매장_상품관리_회원_2026-09-17.md` §4, §6, §12.
//
// 층이 셋인 이유(§4): `games` 는 무슨 게임인가, `products` 는 무엇을 파는 물건인가,
// `shop_listings` 는 누가 얼마에 몇 개 파는가. 같은 게임이 스탠다드, 디럭스, 한정판으로 나오고
// 같은 에디션도 곽팩과 무곽이 다른 물건이며, 세트는 게임 둘을 가리키는 상품 하나다.
// 층을 접으면 그 구분이 전부 한 줄에 눌린다.
//
// 파일을 또 가르는 이유는 schema-shops.ts 머리 주석과 같다 — 한 파일 300줄(AGENTS §4).
// schema.ts 가 재수출하므로 호출부 import 경로는 바뀌지 않는다.
import { pgTable, pgEnum, uuid, text, integer, boolean, numeric, timestamp, index, uniqueIndex } from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";
import { auditColumns } from "./audit";
import { games, users } from "./schema";
import { shops } from "./schema-shops";

/**
 * 기종 사전 — 설계서 §6. `platformEnum` 에 슈퍼패미컴을 더하지 않는 이유가 이 표다.
 *
 * `platformEnum` 값은 전부 우리가 크롤링하는 디지털 스토어다. 거기에 레트로 기종을 섞으면
 * 크롤러가 영원히 만들 수 없는 값이 크롤러 코드의 타입에 들어가고, 기종 하나 늘 때마다 마이그레이션이다.
 * 표로 두면 기종 추가가 관리자 화면의 행 하나가 된다.
 *
 * 현행기도 같은 표에 넣고 디지털 `platformEnum` 값과는 `code` 문자열로 맞춘다.
 * 사양 축(lib/hardware)은 아직 이 표를 읽지 않는다 — 그쪽은 PC 부품 티어 사전이라 겹치는 행이 없다.
 */
export const hardwareModels = pgTable("hardware_models", {
  /** `switch`, `ps5`, `sfc` 처럼 짧은 코드. 디지털 platform 값과 같은 글자를 쓴다 */
  code: text("code").primaryKey(),
  nameKo: text("name_ko").notNull(),
  nameEn: text("name_en"),
  maker: text("maker"),
  /** 몇 세대기인가. 레트로 목록을 세대로 묶어 보여 줄 때 쓴다 */
  generation: integer("generation"),
  releaseYear: integer("release_year"),
  isRetro: boolean("is_retro").default(false).notNull(),
  /** `cartridge` / `disc` / `digital`. 레트로는 매체가 곧 상품의 성격이다 */
  mediaType: text("media_type"),
  sortOrder: integer("sort_order").default(0).notNull(),
  ...auditColumns(),
}, (t) => [index("hardware_models_retro_idx").on(t.isRetro, t.sortOrder)]);

/** 낱개로 파는 물건의 포장 상태 — 레트로 시세를 가르는 값이다(무곽과 곽팩은 값이 몇 배 난다) */
export const packageTypeEnum = pgEnum("package_type", ["cart_only", "boxed", "big_box", "digipak", "code_card", "set"]);
/** 상품 안에 무엇이 들었나 */
export const productComponentKindEnum = pgEnum("product_component_kind", [
  "game", "dlc", "soundtrack", "artbook", "figure", "steelbook", "code", "goods",
]);
export const listingConditionEnum = pgEnum("listing_condition", ["sealed", "new", "used"]);
export const listingStatusEnum = pgEnum("listing_status", ["draft", "selling", "soldout", "hidden"]);
/** 이 줄이 어디서 들어왔나. 손입력과 연동을 처음부터 같이 둔다(설계서 §8) */
export const listingSourceEnum = pgEnum("listing_source", ["manual", "csv", "api", "pos"]);
/**
 * 손님이 이 물건을 어떻게 받나. A 단계는 `inquiry` 하나뿐이다.
 * 그래도 컬럼을 지금 만든다(§12.4) — 나중에 만들면 그 전에 쌓인 행의 과거가 불명이 된다.
 */
export const fulfillmentEnum = pgEnum("fulfillment", ["inquiry", "pickup", "delivery"]);
export const unitGradeEnum = pgEnum("unit_grade", ["S", "A", "B", "C"]);

export type ListingCondition = (typeof listingConditionEnum.enumValues)[number];
export type ListingStatus = (typeof listingStatusEnum.enumValues)[number];
export type ListingSource = (typeof listingSourceEnum.enumValues)[number];
export type PackageType = (typeof packageTypeEnum.enumValues)[number];

/**
 * 상품 정의 — **매장끼리 공유한다**(설계서 §4).
 *
 * 등록한 매장이 소유권을 갖지 않는다. 다른 매장도 같은 상품에 자기 `shop_listings` 를 붙인다.
 * 다만 고치는 권한은 등록 매장과 관리자에게만 준다 — 아무나 고치면 남의 판매 정보가 흔들린다.
 *
 * `registeredShopId` 를 감사 컬럼과 따로 두는 이유(§4.1): `created_source` 는 `shop:{id}` 라는
 * 텍스트라 조인도 인덱스도 안 된다. "이 매장이 만든 상품", "등록이 몰리는 매장" 에 답하려면 컬럼이어야 한다.
 */
export const products = pgTable("products", {
  id: uuid("id").primaryKey().defaultRandom(),
  /**
   * EAN, JAN, UPC. **실물 상품의 자연키다.** 이게 있어야 매장 둘이 같은 물건을 같은 상품으로 만난다.
   * null 을 허용하는 이유: 레트로와 굿즈에는 바코드가 없는 물건이 흔하다.
   */
  barcode: text("barcode"),
  /** 대표 게임. 세트면 대표 하나만 두고 나머지는 product_components 가 갖는다. 굿즈면 null */
  gameId: uuid("game_id").references(() => games.id, { onDelete: "set null" }),
  hardwareCode: text("hardware_code").references(() => hardwareModels.code),
  /** `KR`, `NTSC-J`, `NTSC-U`, `PAL`. 레트로는 지역이 안 맞으면 기기에서 아예 안 돌아간다 */
  regionCode: text("region_code"),
  editionName: text("edition_name"),
  packageType: packageTypeEnum("package_type"),
  /** 한글판 여부. 국내 중고 시세를 가르는 값이다 */
  languageKo: boolean("language_ko"),
  releaseYear: integer("release_year"),
  /** 국내 유통사. 같은 게임이라도 유통사가 다르면 다른 물건으로 취급된다 */
  publisherLabel: text("publisher_label"),
  /** 정품인가. 레트로에는 복각과 비정품이 섞인다 */
  isOfficial: boolean("is_official").default(true).notNull(),
  name: text("name").notNull(),
  registeredShopId: uuid("registered_shop_id").references(() => shops.id, { onDelete: "set null" }),
  verifiedAt: timestamp("verified_at", { withTimezone: true }),
  verifiedBy: uuid("verified_by").references(() => users.id),
  /**
   * 매핑 배치(§5.2)가 이 상품을 마지막으로 본 시각. **없으면 배치가 큐 선두에서 막힌다** —
   * 후보를 못 찾은 상품이 기록 없이 남으면 다음 회차가 같은 행을 또 집고, 뒤에 선 상품은
   * 영영 차례를 못 받는다(2026-09-14 HLTB 매칭 큐가 정확히 이 모양으로 멈춰 있었다).
   */
  gameMatchCheckedAt: timestamp("game_match_checked_at", { withTimezone: true }),
  /**
   * 배치가 찾았지만 자동으로 잇기에는 모자란 후보(§5.2 의 "중간"). 관리자가 보고 정한다.
   *
   * 검수 큐를 별도 표로 만들지 않은 이유: 큐에 담길 것이 "상품 하나에 후보 하나" 뿐이라
   * 표를 세우면 상품과 1:1 인 행을 따로 관리하게 되고, 상품이 지워질 때 남는 고아 행이 생긴다.
   */
  gameMatchSuggestedId: uuid("game_match_suggested_id").references(() => games.id, { onDelete: "set null" }),
  gameMatchConfidence: numeric("game_match_confidence", { precision: 3, scale: 2 }),
  /**
   * 관리자가 물린 후보(§5.2 검수). 지우지 않고 남기는 이유: 배치는 이레마다 같은 카탈로그를
   * 다시 견주므로 기록이 없으면 사람이 거절할수록 같은 후보가 같은 자리에 다시 쌓인다 —
   * 사람이 물릴수록 큐가 차는 쳇바퀴다(스토어 매칭이 거절을 `none` 으로 남기는 이유와 같다).
   */
  gameMatchRejectedId: uuid("game_match_rejected_id").references(() => games.id, { onDelete: "set null" }),
  ...auditColumns(),
}, (t) => [
  // 바코드는 자연키지만 없는 물건이 있어 unique 를 부분 인덱스로 건다 —
  // null 을 여럿 허용하면서 "있는 바코드는 하나뿐" 을 지키는 유일한 방법이다
  uniqueIndex("products_barcode_uq").on(t.barcode).where(sql`barcode is not null`),
  index("products_game_idx").on(t.gameId),
  index("products_shop_idx").on(t.registeredShopId),
  // 매핑 배치가 타는 인덱스 — 아직 게임을 못 단 상품을 오래된 확인 순으로 집는다
  index("products_match_queue_idx").on(t.gameMatchCheckedAt).where(sql`game_id is null`),
]);

/**
 * 상품 구성품 — 이 상품 안에 무엇이 들었나(설계서 §4).
 *
 * 게임 상세의 "파는 곳" 은 대표 `products.gameId` 가 아니라 이 표의 `gameId` 로 찾는다.
 * **세트에 끼어 있어도 그 게임 페이지에 뜬다** — 대표 게임 하나로는 못 하는 일이다.
 */
export const productComponents = pgTable("product_components", {
  id: uuid("id").primaryKey().defaultRandom(),
  productId: uuid("product_id").references(() => products.id, { onDelete: "cascade" }).notNull(),
  kind: productComponentKindEnum("kind").notNull(),
  /** 게임, DLC 는 `games` 행을 가리킨다. 아트북, 피규어는 null 이고 label 만 남는다 */
  gameId: uuid("game_id").references(() => games.id, { onDelete: "set null" }),
  label: text("label"),
  qty: integer("qty").default(1).notNull(),
  ...auditColumns(),
}, (t) => [
  index("product_components_product_idx").on(t.productId),
  // "이 게임을 파는 곳" 질의가 타는 인덱스다. 게임 상세가 매 요청 이걸 묻는다
  index("product_components_game_idx").on(t.gameId),
  // 같은 상품에 같은 게임이 두 줄이면 "파는 곳" 에 같은 매장이 두 번 뜬다. 수량은 qty 가 말하므로
  // 줄을 늘릴 이유가 없다. 넣으려는 경로가 셋(매장 등록, 매핑 배치, 관리자 검수)이라 DB 가 막는다
  uniqueIndex("product_components_game_uq").on(t.productId, t.kind, t.gameId).where(sql`game_id is not null`),
]);

/**
 * 매장이 실제로 파는 것.
 *
 * 같은 상품이라도 신품과 중고는 **다른 행**이다 — 값도 재고도 따로 움직인다.
 * 재고는 처음부터 `available = onHand - held` 로 낸다(§12.1). A 단계에서 held 는 늘 0 이지만
 * 계산을 거쳐 화면에 내야 예약이 붙는 날 화면과 서비스가 한 줄도 안 바뀐다.
 */
export const shopListings = pgTable("shop_listings", {
  id: uuid("id").primaryKey().defaultRandom(),
  shopId: uuid("shop_id").references(() => shops.id, { onDelete: "cascade" }).notNull(),
  productId: uuid("product_id").references(() => products.id, { onDelete: "restrict" }).notNull(),
  condition: listingConditionEnum("condition").notNull(),
  /**
   * 최소 단위 정수로 담는다 — 원이면 원, 엔이면 엔(AGENTS §5, lib/currency).
   * 환산하지 않는다. 비교는 같은 통화끼리만 한다.
   */
  priceMinor: integer("price_minor").notNull(),
  discountMinor: integer("discount_minor"),
  currency: text("currency").default("KRW").notNull(),
  onHand: integer("on_hand").default(0).notNull(),
  /** 예약이 잡아 둔 수량. B 단계가 올린다 — A 에서는 늘 0 이다(§12.1) */
  held: integer("held").default(0).notNull(),
  status: listingStatusEnum("status").default("draft").notNull(),
  source: listingSourceEnum("source").default("manual").notNull(),
  /** 연동으로 들어온 줄이 저쪽에서 갖는 id. 다음 동기화가 같은 줄을 두 번 넣지 않게 한다 */
  externalId: text("external_id"),
  stockUpdatedAt: timestamp("stock_updated_at", { withTimezone: true }),
  /** 중고 한 점짜리 매물인가. true 면 shop_listing_units 에 그 한 점의 상태가 있다 */
  isUnique: boolean("is_unique").default(false).notNull(),
  fulfillment: fulfillmentEnum("fulfillment").default("inquiry").notNull(),
  ...auditColumns(),
}, (t) => [
  // 매장 판매 목록 화면이 타는 인덱스
  index("shop_listings_shop_idx").on(t.shopId, t.status),
  // "이 상품을 파는 곳" 과 "파는 매장이 몇 곳인가"(§4.1 관리자 정렬)가 함께 타는 인덱스
  index("shop_listings_product_idx").on(t.productId, t.status),
  // 같은 매장이 같은 상품, 같은 상태를 두 줄로 올리는 것을 막는다. 신품과 중고는 다른 행이라 condition 이 키에 든다
  uniqueIndex("shop_listings_shop_product_condition_uq").on(t.shopId, t.productId, t.condition),
]);

/**
 * 중고 한 점 — 같은 매물이라도 한 점 한 점 상태가 다르다.
 *
 * `products.packageType` 과 여기 `hasBox` 는 다른 질문이다.
 * 앞은 "곽팩으로 나온 물건인가", 뒤는 "이 물건에 박스가 아직 남아 있나" 다 —
 * 곽팩으로 나왔는데 박스를 잃은 중고가 레트로에는 흔하다.
 */
export const shopListingUnits = pgTable("shop_listing_units", {
  id: uuid("id").primaryKey().defaultRandom(),
  listingId: uuid("listing_id").references(() => shopListings.id, { onDelete: "cascade" }).notNull(),
  unitNo: integer("unit_no").notNull(),
  grade: unitGradeEnum("grade"),
  hasBox: boolean("has_box"),
  hasManual: boolean("has_manual"),
  hasInsert: boolean("has_insert"),
  hasCase: boolean("has_case"),
  defectNote: text("defect_note"),
  soldAt: timestamp("sold_at", { withTimezone: true }),
  ...auditColumns(),
}, (t) => [uniqueIndex("shop_listing_units_no_uq").on(t.listingId, t.unitNo)]);

/**
 * 재고가 움직인 기록 — 설계서 §12.5. A 단계부터 돌린다.
 *
 * 나중에 켜면 그 전 기간이 통째로 공백이고, 하필 그 공백에서 "언제부터 0 이었나" 를 묻게 된다.
 * 값을 담는 것이 아니라 **차이를 담는다** — 앞뒤 수량을 같이 적어야 중간에 빠진 회차가 드러난다.
 */
export const shopStockEvents = pgTable("shop_stock_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  listingId: uuid("listing_id").references(() => shopListings.id, { onDelete: "cascade" }).notNull(),
  beforeQty: integer("before_qty").notNull(),
  afterQty: integer("after_qty").notNull(),
  /** `manual`, `csv`, `order`, `correction`. 문자열로 두는 이유: 주문이 붙으면 값이 는다 */
  reason: text("reason").notNull(),
  ...auditColumns(),
}, (t) => [index("shop_stock_events_listing_idx").on(t.listingId, t.createdAt)]);

export const productsRelations = relations(products, ({ one, many }) => ({
  game: one(games, { fields: [products.gameId], references: [games.id] }),
  registeredShop: one(shops, { fields: [products.registeredShopId], references: [shops.id] }),
  components: many(productComponents),
  listings: many(shopListings),
}));

export const productComponentsRelations = relations(productComponents, ({ one }) => ({
  product: one(products, { fields: [productComponents.productId], references: [products.id] }),
  game: one(games, { fields: [productComponents.gameId], references: [games.id] }),
}));

export const shopListingsRelations = relations(shopListings, ({ one, many }) => ({
  shop: one(shops, { fields: [shopListings.shopId], references: [shops.id] }),
  product: one(products, { fields: [shopListings.productId], references: [products.id] }),
  units: many(shopListingUnits),
  stockEvents: many(shopStockEvents),
}));

export const shopListingUnitsRelations = relations(shopListingUnits, ({ one }) => ({
  listing: one(shopListings, { fields: [shopListingUnits.listingId], references: [shopListings.id] }),
}));
