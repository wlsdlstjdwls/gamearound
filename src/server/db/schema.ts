// gamearound DB 스키마 — 설계서 §3.2 그대로. 확장1 테이블은 미정의(§3.3 컬럼만 문서화).
import {
  pgTable, pgEnum, uuid, text, integer, numeric, boolean,
  timestamp, date, jsonb, primaryKey, index, uniqueIndex,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";
// 발견 요약의 형태는 sync/discover 가 정한다. 타입만 가져오므로 런타임 의존은 생기지 않는다 —
// 여기서 모양을 한 번 더 적으면 두 곳이 말없이 어긋난다
import type { DiscoveryLog } from "@/server/sync/discover";

export const platformEnum = pgEnum("platform", ["steam", "ps5", "ps4", "xbox", "switch", "switch2", "epic", "gog"]);
export const sourceEnum = pgEnum("source", ["steam", "psstore", "xbox", "nintendo", "nintendo_jp", "hltb", "opencritic", "metacritic", "rss", "manual", "wikidata", "gamepass", "epic", "gog"]);
export const roleEnum = pgEnum("role", ["user", "game_company", "seller", "admin"]);
export const syncStatusEnum = pgEnum("sync_status", ["ok", "partial", "failed"]);
/**
 * 가격의 통화. 스토어가 그 나라에 파는 통화를 그대로 담는다 — 환산하지 않는다.
 * GOG 는 한국에도 USD 로 판다(2026-09-14 확인: currencyCode=KRW 로 조회하면 0건).
 * 임의 환율로 바꿔 적으면 화면 가격과 실제 결제액이 어긋나고, 그건 가격 알림 서비스에서 제일 하면 안 되는 일이다.
 */
export const currencyEnum = pgEnum("currency", ["KRW", "USD", "JPY"]);

/**
 * 가격이 어느 나라 스토어의 것인지. 같은 게임, 같은 기기라도 스토어가 나라별로 따로라
 * 가격도 판매 여부도 다르다 — 한국 eShop 미발매작이 일본 eShop 에는 있다(2026-09-14).
 *
 * 왜 platform 을 늘리지 않았나: 기기는 그대로 Switch 다. 지역은 "어디서 파느냐" 라는 다른 축이고,
 * 이 축을 platform 에 접으면(switch_jp 같은 값) 기기별 필터, 배지가 전부 지역만큼 늘어난다.
 */
export const regionEnum = pgEnum("region", ["KR", "JP"]);
/** 화면과 수집의 기준 지역. 이 값이 아닌 행은 "참고 가격" 으로만 보여 준다 */
export const HOME_REGION = "KR" as const;

/**
 * 게임 레코드의 성격. DLC 를 별도 테이블이 아니라 games 행으로 담는 이유(기획서 5.4):
 * price_snapshots, price_alerts, wishlists 가 전부 game_platforms 에 붙어 있어
 * DLC 를 분리하면 가격 이력과 알림 경로를 통째로 복제해야 한다.
 * edition(디럭스판), bundle(묶음)은 지금 채우지 않지만 어휘를 미리 열어 둔다 — 나중에 enum 을 늘리면 마이그레이션이 또 필요하다.
 */
export const contentTypeEnum = pgEnum("content_type", ["game", "dlc", "edition", "bundle"]);
/** 회사가 이 게임에 대해 가진 역할. 같은 회사가 개발과 배급을 겸하면 행 2개가 된다 */
export const companyRoleEnum = pgEnum("company_role", ["developer", "publisher"]);
/**
 * 세대 간 업그레이드 방식. Switch 2 Edition 전용이 아니라 세대 중립으로 둔다 —
 * PS4 에서 PS5 로의 무료 업그레이드, Xbox Smart Delivery 가 같은 모양이다.
 */
export const upgradeKindEnum = pgEnum("upgrade_kind", ["free", "paid", "subscription_included"]);

export type Platform = (typeof platformEnum.enumValues)[number];
export type SourceName = (typeof sourceEnum.enumValues)[number];
export type Role = (typeof roleEnum.enumValues)[number];
export type SyncStatus = (typeof syncStatusEnum.enumValues)[number];
export type Currency = (typeof currencyEnum.enumValues)[number];
export type Region = (typeof regionEnum.enumValues)[number];
export type ContentType = (typeof contentTypeEnum.enumValues)[number];
export type CompanyRole = (typeof companyRoleEnum.enumValues)[number];
export type UpgradeKind = (typeof upgradeKindEnum.enumValues)[number];

export const games = pgTable("games", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  titleKo: text("title_ko"),
  titleEn: text("title_en").notNull(),
  description: text("description"),
  // 가로 배너(460×215, Steam header.jpg) — 카드, 목록용
  coverUrl: text("cover_url"),
  // 세로 아트(600×900, Steam library_capsule) — 상세 헤더의 세로 슬롯용. 없으면 coverUrl 로 폴백
  portraitUrl: text("portrait_url"),
  developer: text("developer"),
  publisher: text("publisher"),
  // 멀티플레이 정보 — 기획서 3-6
  localMaxPlayers: integer("local_max_players"),
  onlineMaxPlayers: integer("online_max_players"),
  supportsSolo: boolean("supports_solo").default(true),
  supportsCoop: boolean("supports_coop").default(false),
  supportsPvp: boolean("supports_pvp").default(false),
  isRetro: boolean("is_retro").default(false),
  /** 본편인지 DLC 인지. 목록, 검색, 홈은 game 만 본다(lib/games-query.ts 한 곳에서 거른다) */
  contentType: contentTypeEnum("content_type").default("game").notNull(),
  /** DLC 가 가리키는 본편. contentType 이 game 이면 null. 본편이 지워지면 DLC 도 같이 지운다 */
  parentGameId: uuid("parent_game_id").references((): AnyPgColumn => games.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  /**
   * 검색용 정규화 제목 — 소문자 + 영숫자, 한글, 가나, 한자 외 전부 제거.
   * "엘든 링" / "ELDEN RING:" 처럼 공백, 구두점만 다른 질의를 흡수한다(§4.2 normalizeTitle 의 DB 판).
   * [:alnum:] 은 C.UTF-8 에서 한글, 가나, 한자를 포함하고 공백, ™, : 는 제외한다(2026-09-14 확인).
   * 한/영을 한 컬럼에 합치지 않는 이유: similarity() 가 긴 문자열에서 희석돼 한글 질의가 임계값 아래로 떨어진다.
   * 생성 컬럼이라 크롤러가 따로 갱신하지 않는다 — title_en/title_ko 만 쓰면 자동으로 따라온다.
   */
  titleEnNorm: text("title_en_norm").generatedAlwaysAs(
    sql`lower(regexp_replace(title_en, '[^[:alnum:]]+', '', 'g'))`,
  ),
  titleKoNorm: text("title_ko_norm").generatedAlwaysAs(
    sql`lower(regexp_replace(coalesce(title_ko, ''), '[^[:alnum:]]+', '', 'g'))`,
  ),
}, (t) => [
  index("games_title_en_idx").on(t.titleEn),
  // 목록 쿼리가 매번 content_type='game' 으로 거르고, 상세는 parent_game_id 로 DLC 를 모은다
  index("games_content_parent_idx").on(t.contentType, t.parentGameId),
]);

export const genres = pgTable("genres", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: text("name").notNull().unique(),
});

export const gameGenres = pgTable("game_genres", {
  gameId: uuid("game_id").references(() => games.id, { onDelete: "cascade" }).notNull(),
  genreId: integer("genre_id").references(() => genres.id).notNull(),
}, (t) => [primaryKey({ columns: [t.gameId, t.genreId] })]);

export const gamePlatforms = pgTable("game_platforms", {
  id: uuid("id").primaryKey().defaultRandom(),
  gameId: uuid("game_id").references(() => games.id, { onDelete: "cascade" }).notNull(),
  platform: platformEnum("platform").notNull(),
  storeExternalId: text("store_external_id"),
  storeUrl: text("store_url"),
  releaseDate: date("release_date"),
  currentVersion: text("current_version"),
  /**
   * 가격은 통화의 최소 단위 정수다 — KRW 는 원(소수 없음), USD 는 센트(6.99달러 = 699).
   * 소수를 쓰지 않는 이유: 부동소수 반올림이 알림 임계값 비교에 섞이면 안 된다.
   */
  listPrice: integer("list_price"),
  currentPrice: integer("current_price"),
  discountPct: integer("discount_pct"),
  // 할인 기간, 행사명 (기획서 3-2 "할인 가격 그래프", dekudeals 참고). 소스가 주는 만큼만 채운다:
  // steam=IStoreBrowseService active_discounts(종료시각+행사 토큰), xbox=Availability.Conditions(시작, 종료), 그 외 null
  discountStartsAt: timestamp("discount_starts_at", { withTimezone: true }),
  discountEndsAt: timestamp("discount_ends_at", { withTimezone: true }),
  discountName: text("discount_name"),
  /** 위 가격 두 개의 통화. 비교, 집계는 같은 통화끼리만 한다(services 의 DISPLAY_CURRENCY) */
  currency: currencyEnum("currency").default("KRW").notNull(),
  metacriticScore: integer("metacritic_score"),
  opencriticScore: integer("opencritic_score"),
  lastSyncedAt: timestamp("last_synced_at", { withTimezone: true }),  // UI "갱신 시각" 표시 원천
  syncStatus: syncStatusEnum("sync_status").default("ok"),
  /**
   * 이 스토어가 "추가 콘텐츠 있음"이라고 알려준 값(xbox Properties.HasAddOns).
   * DLC 목록을 못 가져오는 플랫폼에서도 유무 배지는 띄우기 위한 것 — 목록과 별개의 신호다.
   */
  hasAddOns: boolean("has_add_ons"),
  /**
   * 이 본편의 DLC 목록을 스토어에 마지막으로 물어본 시각.
   * 배치 조회(steam GetItems)는 자식이 부모를 가리키는 방향만 주고 본편이 가진 DLC 목록은 주지 않아,
   * 목록은 단건 요청(appdetails)을 한 번 더 보내야 얻는다. 요청이 비싸므로 언제 물어봤는지를 남겨
   * 같은 본편을 매 실행 다시 묻지 않는다(sync/dlc-list 의 DLC_LIST_REFRESH_DAYS).
   */
  dlcListedAt: timestamp("dlc_listed_at", { withTimezone: true }),
  /**
   * 이 가격을 파는 스토어의 나라. 한 게임, 한 기기라도 나라 수만큼 행이 생긴다
   * (닌텐도 스위치 = 한국 eShop 행 + 일본 eShop 행). 통화도 그 나라의 것이다.
   */
  region: regionEnum("region").default("KR").notNull(),
  /**
   * 스토어가 쓰는 "작품" 코드. nsuid 같은 판매 단위 ID 와 다르다 — 그쪽은 나라마다 다른 값이지만
   * 이 코드는 같은 작품이면 나라가 달라도 같다(2026-09-14 실측: 한국 SKU HACPA5WZA 와
   * 일본 icode A5WZA 가 같은 No Man's Sky).
   *
   * 쓰는 곳: 일본 eShop 에서 발견한 상품이 우리가 이미 아는 게임인지 판정한다. 제목으로는 못 한다 —
   * 일본 제목이 가타카나면("ア フォルド エーパート") 영문 카탈로그와 유사도가 0 이다.
   * 지금은 닌텐도만 채운다. 다른 스토어가 같은 성격의 코드를 주면 그때 같이 쓴다.
   */
  titleCode: text("title_code"),
}, (t) => [
  uniqueIndex("gp_game_platform_region_uq").on(t.gameId, t.platform, t.region),
  index("gp_title_code_idx").on(t.titleCode),
]);

/**
 * 가격 이력. 통화 컬럼을 따로 두지 않는다 — 스냅샷은 언제나 game_platforms 한 행에 매달려 있고,
 * 한 스토어가 파는 통화는 바뀌지 않는다. 통화는 그 행에서 읽는다.
 */
export const priceSnapshots = pgTable("price_snapshots", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  gamePlatformId: uuid("game_platform_id").references(() => gamePlatforms.id, { onDelete: "cascade" }).notNull(),
  price: integer("price").notNull(),
  discountPct: integer("discount_pct").default(0),
  // 그래프에서 할인 구간을 그리기 위해 스냅샷에도 남긴다(당시 행사 종료 예정 시각, 행사명)
  discountEndsAt: timestamp("discount_ends_at", { withTimezone: true }),
  discountName: text("discount_name"),
  capturedAt: timestamp("captured_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => [index("ps_gp_captured_idx").on(t.gamePlatformId, t.capturedAt)]);

export const gameSourceRefs = pgTable("game_source_refs", {
  gameId: uuid("game_id").references(() => games.id, { onDelete: "cascade" }).notNull(),
  source: sourceEnum("source").notNull(),
  externalId: text("external_id").notNull(),
  url: text("url"),
  /**
   * 매칭한 순간 그 스토어가 부르던 제목. 검수 큐에서 우리 제목과 나란히 보여 준다 —
   * 이게 없으면 검수자가 "이 후보가 같은 게임인가" 를 링크를 열어 봐야만 알 수 있다.
   * 실제로 Escape from Tarkov 에 닌텐도의 "Escape from Tarkan" 이 붙어 검수 큐에 올라왔다(2026-09-14).
   * 표시용 기록이라 스토어가 제목을 바꿔도 따라가지 않는다 — 그때 무엇을 보고 판단했는지가 남아야 한다.
   */
  matchedTitle: text("matched_title"),
  // "auto" | "manual" | "pending" | "none" — pending = 유사도 0.7~0.9 관리자 검수 큐 (§4.2), none = 미매칭 기록(재검색 방지, 수집 대상 아님)
  matchedBy: text("matched_by").notNull(),
  confidence: numeric("confidence", { precision: 3, scale: 2 }),
  // 마지막 매칭 시도 시각 — matched_by="none" 행의 재검색 주기 판단용(NONE_RETRY_DAYS)
  checkedAt: timestamp("checked_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  primaryKey({ columns: [t.gameId, t.source] }),
  index("gsr_source_matched_checked_idx").on(t.source, t.matchedBy, t.checkedAt),
]);

/**
 * 발견했지만 수집하지 않기로 한 외부 SKU.
 *
 * 왜 따로 두나: game_source_refs 는 (game_id, source) 가 PK 라 "이미 아는 게임의 두 번째 SKU"
 * (에디션 판, Windows 판)를 담을 자리가 없다. 그렇다고 그냥 버리면 발견이 매 실행 이 SKU 를
 * 신규로 집어 시드 몫을 먹는다 — 이런 SKU 는 계속 쌓이므로 결국 신규 게임이 다시 0건이 된다.
 */
export const discoveryIgnores = pgTable("discovery_ignores", {
  source: sourceEnum("source").notNull(),
  externalId: text("external_id").notNull(),
  /** 같은 게임이라고 판단한 상대. 판단을 나중에 되짚을 수 있게 남긴다(신규 게임이면 null) */
  gameId: uuid("game_id").references(() => games.id, { onDelete: "cascade" }),
  reason: text("reason").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => [primaryKey({ columns: [t.source, t.externalId] })]);

export const playtimes = pgTable("playtimes", {
  gameId: uuid("game_id").primaryKey().references(() => games.id, { onDelete: "cascade" }),
  mainStoryHours: numeric("main_story_hours", { precision: 5, scale: 1 }),
  mainExtraHours: numeric("main_extra_hours", { precision: 5, scale: 1 }),
  completionistHours: numeric("completionist_hours", { precision: 5, scale: 1 }),
  lastSyncedAt: timestamp("last_synced_at", { withTimezone: true }),
});

export const news = pgTable("news", {
  id: uuid("id").primaryKey().defaultRandom(),
  gameId: uuid("game_id").references(() => games.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  url: text("url").notNull().unique(),
  sourceName: text("source_name").notNull(),
  thumbnailUrl: text("thumbnail_url"),
  publishedAt: timestamp("published_at", { withTimezone: true }).notNull(),
}, (t) => [index("news_game_pub_idx").on(t.gameId, t.publishedAt)]);

// 자체 인증(§6 개정 2026-09-11, 외부 인증 SaaS 미사용). email은 소문자 정규화 후 저장(unique).
// passwordHash는 nullable — 확장 지점: SNS/OAuth 계정은 비밀번호 없이 가입 가능. provider 연결은 별도 auth_accounts 테이블로 추가 예정.
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash"),
  role: roleEnum("role").default("user").notNull(),
  displayName: text("display_name"),
  emailVerifiedAt: timestamp("email_verified_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// 서버 세션(쿠키에는 랜덤 토큰, DB에는 sha256 해시만). 만료, 강제 로그아웃은 행 삭제로 처리.
export const sessions = pgTable("sessions", {
  id: text("id").primaryKey(), // sha256(token) hex
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).defaultNow().notNull(),
  userAgent: text("user_agent"),
  ip: text("ip"),
}, (t) => [index("sessions_user_idx").on(t.userId), index("sessions_expires_idx").on(t.expiresAt)]);

export const wishlists = pgTable("wishlists", {
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  gameId: uuid("game_id").references(() => games.id, { onDelete: "cascade" }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => [primaryKey({ columns: [t.userId, t.gameId] })]);

export const pushSubscriptions = pgTable("push_subscriptions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  endpoint: text("endpoint").notNull().unique(),
  p256dh: text("p256dh").notNull(),
  auth: text("auth").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const priceAlerts = pgTable("price_alerts", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  gameId: uuid("game_id").references(() => games.id, { onDelete: "cascade" }).notNull(),
  platform: platformEnum("platform"),          // null = 모든 플랫폼
  minDiscountPct: integer("min_discount_pct").default(1), // 1 = 할인 발생 시
  isActive: boolean("is_active").default(true).notNull(),
}, (t) => [index("pa_game_active_idx").on(t.gameId, t.isActive)]);

export const alertDeliveries = pgTable("alert_deliveries", {
  alertId: uuid("alert_id").references(() => priceAlerts.id, { onDelete: "cascade" }).notNull(),
  snapshotId: integer("snapshot_id").references(() => priceSnapshots.id).notNull(),
  sentAt: timestamp("sent_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => [primaryKey({ columns: [t.alertId, t.snapshotId] })]);

export const syncLogs = pgTable("sync_logs", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  source: sourceEnum("source").notNull(),
  status: syncStatusEnum("status").notNull(),
  processed: integer("processed").default(0),
  failed: integer("failed").default(0),
  errorSample: text("error_sample"),
  // 카탈로그 발견을 돌린 실행만 채운다(그 외에는 null). 한 컬럼에 묶은 이유:
  // 이 값들은 따로 질의하는 지표가 아니라 "이 실행의 발견이 어디서 멈췄나" 를 함께 읽는 한 덩어리다.
  // 포화 여부는 discovery->>'stoppedBy' = 'budget' 으로 센다.
  discovery: jsonb("discovery").$type<DiscoveryLog>(),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull(),
  finishedAt: timestamp("finished_at", { withTimezone: true }),
});

export const dataCorrections = pgTable("data_corrections", {
  id: uuid("id").primaryKey().defaultRandom(),
  adminUserId: uuid("admin_user_id").references(() => users.id).notNull(),
  table: text("table").notNull(),
  rowId: text("row_id").notNull(),
  field: text("field").notNull(),
  before: jsonb("before"),
  after: jsonb("after"),
  lockField: boolean("lock_field").default(true), // true면 크롤러가 덮어쓰지 않음
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// ---- 회사 (기획서 F1, F2, F4) ----
// games.developer/publisher 자유 텍스트를 지우지 않고 남겨 둔 이유: 회사 매칭에 실패한 표기의 보존처이자
// 백필이 끝나기 전까지의 화면 폴백이다.
export const companies = pgTable("companies", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  nameEn: text("name_en").notNull(),
  nameKo: text("name_ko"),
  countryCode: text("country_code"),      // ISO 3166-1 alpha-2. 필터 키
  countryNameKo: text("country_name_ko"), // "일본" 등 표시용
  foundedAt: date("founded_at"),
  hqNameKo: text("hq_name_ko"),
  websiteUrl: text("website_url"),
  description: text("description"),
  wikidataId: text("wikidata_id").unique(), // Q번호. 재조회 키
  lastSyncedAt: timestamp("last_synced_at", { withTimezone: true }),
}, (t) => [index("companies_country_idx").on(t.countryCode)]);

/**
 * 스토어마다 같은 회사를 다르게 적는다 — steam "FromSoftware, Inc.", xbox "UBISOFT"(전부 대문자).
 * 정규화한 표기를 여기에 쌓아 두 번째부터는 외부 질의 없이 회사를 찾는다.
 */
export const companyAliases = pgTable("company_aliases", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  companyId: uuid("company_id").references(() => companies.id, { onDelete: "cascade" }).notNull(),
  aliasNorm: text("alias_norm").notNull().unique(), // lib/company-name.ts 의 normalizeCompanyName 결과
  aliasRaw: text("alias_raw").notNull(),
  source: sourceEnum("source").notNull(),
});

export const gameCompanies = pgTable("game_companies", {
  gameId: uuid("game_id").references(() => games.id, { onDelete: "cascade" }).notNull(),
  companyId: uuid("company_id").references(() => companies.id, { onDelete: "cascade" }).notNull(),
  role: companyRoleEnum("role").notNull(),
}, (t) => [
  primaryKey({ columns: [t.gameId, t.companyId, t.role] }),
  index("gc_company_role_idx").on(t.companyId, t.role),
]);

// ---- 구독 서비스 (기획서 F7 을 Game Pass 전용이 아니라 일반화) ----
export const subscriptions = pgTable("subscriptions", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  key: text("key").notNull().unique(), // "gamepass_console" 등. 코드가 참조하는 안정적 식별자
  labelKo: text("label_ko").notNull(),
  platform: platformEnum("platform").notNull(),
  catalogId: text("catalog_id"),       // Game Pass 컬렉션 GUID 등 수집 키
  isActive: boolean("is_active").default(true).notNull(),
});

/**
 * 포함 여부를 행 삭제가 아니라 removedAt 으로 표시한다.
 * 이탈 자체가 사용자에게 가치 있는 정보이고("곧 빠져요"), 일시적 수집 실패로 행이 사라지는 사고도 막는다.
 */
export const gameSubscriptions = pgTable("game_subscriptions", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  gamePlatformId: uuid("game_platform_id").references(() => gamePlatforms.id, { onDelete: "cascade" }).notNull(),
  subscriptionId: integer("subscription_id").references(() => subscriptions.id, { onDelete: "cascade" }).notNull(),
  addedAt: timestamp("added_at", { withTimezone: true }).defaultNow().notNull(),
  removedAt: timestamp("removed_at", { withTimezone: true }),
}, (t) => [
  index("gs_sub_removed_idx").on(t.subscriptionId, t.removedAt),
  index("gs_gp_idx").on(t.gamePlatformId),
]);

// ---- 세대 간 업그레이드 (기획서 F6) ----
export const upgrades = pgTable("upgrades", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  gameId: uuid("game_id").references(() => games.id, { onDelete: "cascade" }).notNull(),
  fromPlatform: platformEnum("from_platform").notNull(),
  toPlatform: platformEnum("to_platform").notNull(),
  kind: upgradeKindEnum("kind").notNull(),
  price: integer("price"),               // KRW. kind 가 paid 일 때만 의미가 있다
  storeExternalId: text("store_external_id"),
  storeUrl: text("store_url"),
  note: text("note"),                    // "원본 소유 필요" 같은 조건
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => [uniqueIndex("upgrades_game_from_to_uq").on(t.gameId, t.fromPlatform, t.toPlatform)]);

// ---- relations (drizzle relational query API 용) ----
export const gamesRelations = relations(games, ({ many, one }) => ({
  platforms: many(gamePlatforms),
  sourceRefs: many(gameSourceRefs),
  genres: many(gameGenres),
  news: many(news),
  playtime: one(playtimes, { fields: [games.id], references: [playtimes.gameId] }),
  companies: many(gameCompanies),
  upgrades: many(upgrades),
  parent: one(games, { fields: [games.parentGameId], references: [games.id], relationName: "gameDlc" }),
  dlcs: many(games, { relationName: "gameDlc" }),
}));
export const gamePlatformsRelations = relations(gamePlatforms, ({ one, many }) => ({
  game: one(games, { fields: [gamePlatforms.gameId], references: [games.id] }),
  snapshots: many(priceSnapshots),
  subscriptions: many(gameSubscriptions),
}));
export const companiesRelations = relations(companies, ({ many }) => ({
  games: many(gameCompanies),
  aliases: many(companyAliases),
}));
export const companyAliasesRelations = relations(companyAliases, ({ one }) => ({
  company: one(companies, { fields: [companyAliases.companyId], references: [companies.id] }),
}));
export const gameCompaniesRelations = relations(gameCompanies, ({ one }) => ({
  game: one(games, { fields: [gameCompanies.gameId], references: [games.id] }),
  company: one(companies, { fields: [gameCompanies.companyId], references: [companies.id] }),
}));
export const subscriptionsRelations = relations(subscriptions, ({ many }) => ({
  games: many(gameSubscriptions),
}));
export const gameSubscriptionsRelations = relations(gameSubscriptions, ({ one }) => ({
  gamePlatform: one(gamePlatforms, { fields: [gameSubscriptions.gamePlatformId], references: [gamePlatforms.id] }),
  subscription: one(subscriptions, { fields: [gameSubscriptions.subscriptionId], references: [subscriptions.id] }),
}));
export const upgradesRelations = relations(upgrades, ({ one }) => ({
  game: one(games, { fields: [upgrades.gameId], references: [games.id] }),
}));
export const priceSnapshotsRelations = relations(priceSnapshots, ({ one }) => ({
  gamePlatform: one(gamePlatforms, { fields: [priceSnapshots.gamePlatformId], references: [gamePlatforms.id] }),
}));
export const gameSourceRefsRelations = relations(gameSourceRefs, ({ one }) => ({
  game: one(games, { fields: [gameSourceRefs.gameId], references: [games.id] }),
}));
export const gameGenresRelations = relations(gameGenres, ({ one }) => ({
  game: one(games, { fields: [gameGenres.gameId], references: [games.id] }),
  genre: one(genres, { fields: [gameGenres.genreId], references: [genres.id] }),
}));
export const genresRelations = relations(genres, ({ many }) => ({ games: many(gameGenres) }));
export const newsRelations = relations(news, ({ one }) => ({
  game: one(games, { fields: [news.gameId], references: [games.id] }),
}));
export const playtimesRelations = relations(playtimes, ({ one }) => ({
  game: one(games, { fields: [playtimes.gameId], references: [games.id] }),
}));
export const usersRelations = relations(users, ({ many }) => ({
  wishlists: many(wishlists),
  pushSubscriptions: many(pushSubscriptions),
  priceAlerts: many(priceAlerts),
  sessions: many(sessions),
}));
export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, { fields: [sessions.userId], references: [users.id] }),
}));
export const wishlistsRelations = relations(wishlists, ({ one }) => ({
  user: one(users, { fields: [wishlists.userId], references: [users.id] }),
  game: one(games, { fields: [wishlists.gameId], references: [games.id] }),
}));
export const pushSubscriptionsRelations = relations(pushSubscriptions, ({ one }) => ({
  user: one(users, { fields: [pushSubscriptions.userId], references: [users.id] }),
}));
export const priceAlertsRelations = relations(priceAlerts, ({ one, many }) => ({
  user: one(users, { fields: [priceAlerts.userId], references: [users.id] }),
  game: one(games, { fields: [priceAlerts.gameId], references: [games.id] }),
  deliveries: many(alertDeliveries),
}));
export const alertDeliveriesRelations = relations(alertDeliveries, ({ one }) => ({
  alert: one(priceAlerts, { fields: [alertDeliveries.alertId], references: [priceAlerts.id] }),
  snapshot: one(priceSnapshots, { fields: [alertDeliveries.snapshotId], references: [priceSnapshots.id] }),
}));
