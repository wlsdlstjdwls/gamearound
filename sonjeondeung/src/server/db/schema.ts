// 손전등 DB 스키마 — 설계서 §3.2 그대로. 확장1 테이블은 미정의(§3.3 컬럼만 문서화).
import {
  pgTable, pgEnum, uuid, text, integer, numeric, boolean,
  timestamp, date, jsonb, primaryKey, index, uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const platformEnum = pgEnum("platform", ["steam", "ps5", "ps4", "xbox", "switch", "switch2"]);
export const sourceEnum = pgEnum("source", ["steam", "psstore", "xbox", "nintendo", "hltb", "opencritic", "metacritic", "rss", "manual"]);
export const roleEnum = pgEnum("role", ["user", "game_company", "seller", "admin"]);
export const syncStatusEnum = pgEnum("sync_status", ["ok", "partial", "failed"]);

export type Platform = (typeof platformEnum.enumValues)[number];
export type SourceName = (typeof sourceEnum.enumValues)[number];
export type Role = (typeof roleEnum.enumValues)[number];
export type SyncStatus = (typeof syncStatusEnum.enumValues)[number];

export const games = pgTable("games", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  titleKo: text("title_ko"),
  titleEn: text("title_en").notNull(),
  description: text("description"),
  coverUrl: text("cover_url"),
  developer: text("developer"),
  publisher: text("publisher"),
  // 멀티플레이 정보 — 기획서 3-6
  localMaxPlayers: integer("local_max_players"),
  onlineMaxPlayers: integer("online_max_players"),
  supportsSolo: boolean("supports_solo").default(true),
  supportsCoop: boolean("supports_coop").default(false),
  supportsPvp: boolean("supports_pvp").default(false),
  isRetro: boolean("is_retro").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => [index("games_title_en_idx").on(t.titleEn)]);

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
  listPrice: integer("list_price"),          // KRW 정수
  currentPrice: integer("current_price"),
  discountPct: integer("discount_pct"),
  metacriticScore: integer("metacritic_score"),
  opencriticScore: integer("opencritic_score"),
  lastSyncedAt: timestamp("last_synced_at"),  // UI "갱신 시각" 표시 원천
  syncStatus: syncStatusEnum("sync_status").default("ok"),
}, (t) => [uniqueIndex("gp_game_platform_uq").on(t.gameId, t.platform)]);

export const priceSnapshots = pgTable("price_snapshots", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  gamePlatformId: uuid("game_platform_id").references(() => gamePlatforms.id, { onDelete: "cascade" }).notNull(),
  price: integer("price").notNull(),
  discountPct: integer("discount_pct").default(0),
  capturedAt: timestamp("captured_at").defaultNow().notNull(),
}, (t) => [index("ps_gp_captured_idx").on(t.gamePlatformId, t.capturedAt)]);

export const gameSourceRefs = pgTable("game_source_refs", {
  gameId: uuid("game_id").references(() => games.id, { onDelete: "cascade" }).notNull(),
  source: sourceEnum("source").notNull(),
  externalId: text("external_id").notNull(),
  url: text("url"),
  // "auto" | "manual" | "pending" — pending = 유사도 0.7~0.9 관리자 검수 큐 (§4.2)
  matchedBy: text("matched_by").notNull(),
  confidence: numeric("confidence", { precision: 3, scale: 2 }),
}, (t) => [primaryKey({ columns: [t.gameId, t.source] })]);

export const playtimes = pgTable("playtimes", {
  gameId: uuid("game_id").primaryKey().references(() => games.id, { onDelete: "cascade" }),
  mainStoryHours: numeric("main_story_hours", { precision: 5, scale: 1 }),
  mainExtraHours: numeric("main_extra_hours", { precision: 5, scale: 1 }),
  completionistHours: numeric("completionist_hours", { precision: 5, scale: 1 }),
  lastSyncedAt: timestamp("last_synced_at"),
});

export const news = pgTable("news", {
  id: uuid("id").primaryKey().defaultRandom(),
  gameId: uuid("game_id").references(() => games.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  url: text("url").notNull().unique(),
  sourceName: text("source_name").notNull(),
  thumbnailUrl: text("thumbnail_url"),
  publishedAt: timestamp("published_at").notNull(),
}, (t) => [index("news_game_pub_idx").on(t.gameId, t.publishedAt)]);

// 자체 인증(§6 개정 2026-09-11, 외부 인증 SaaS 미사용). email은 소문자 정규화 후 저장(unique).
// passwordHash는 nullable — 확장 지점: SNS/OAuth 계정은 비밀번호 없이 가입 가능. provider 연결은 별도 auth_accounts 테이블로 추가 예정.
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash"),
  role: roleEnum("role").default("user").notNull(),
  displayName: text("display_name"),
  emailVerifiedAt: timestamp("email_verified_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// 서버 세션(쿠키에는 랜덤 토큰, DB에는 sha256 해시만). 만료·강제 로그아웃은 행 삭제로 처리.
export const sessions = pgTable("sessions", {
  id: text("id").primaryKey(), // sha256(token) hex
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  lastSeenAt: timestamp("last_seen_at").defaultNow().notNull(),
  userAgent: text("user_agent"),
  ip: text("ip"),
}, (t) => [index("sessions_user_idx").on(t.userId), index("sessions_expires_idx").on(t.expiresAt)]);

export const wishlists = pgTable("wishlists", {
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  gameId: uuid("game_id").references(() => games.id, { onDelete: "cascade" }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [primaryKey({ columns: [t.userId, t.gameId] })]);

export const pushSubscriptions = pgTable("push_subscriptions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  endpoint: text("endpoint").notNull().unique(),
  p256dh: text("p256dh").notNull(),
  auth: text("auth").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
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
  sentAt: timestamp("sent_at").defaultNow().notNull(),
}, (t) => [primaryKey({ columns: [t.alertId, t.snapshotId] })]);

export const syncLogs = pgTable("sync_logs", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  source: sourceEnum("source").notNull(),
  status: syncStatusEnum("status").notNull(),
  processed: integer("processed").default(0),
  failed: integer("failed").default(0),
  errorSample: text("error_sample"),
  startedAt: timestamp("started_at").notNull(),
  finishedAt: timestamp("finished_at"),
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
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ---- relations (drizzle relational query API 용) ----
export const gamesRelations = relations(games, ({ many, one }) => ({
  platforms: many(gamePlatforms),
  sourceRefs: many(gameSourceRefs),
  genres: many(gameGenres),
  news: many(news),
  playtime: one(playtimes, { fields: [games.id], references: [playtimes.gameId] }),
}));
export const gamePlatformsRelations = relations(gamePlatforms, ({ one, many }) => ({
  game: one(games, { fields: [gamePlatforms.gameId], references: [games.id] }),
  snapshots: many(priceSnapshots),
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
