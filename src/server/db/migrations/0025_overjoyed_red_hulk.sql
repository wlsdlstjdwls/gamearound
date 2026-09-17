-- 감사 컬럼 소급 — 모든 테이블이 created_by/created_source/created_at, updated_by/updated_source/updated_at 를 갖는다.
-- 전부 ADD COLUMN 이라 기존 값은 건드리지 않는다(DROP, ALTER COLUMN 없음).
--
-- 아래 백필이 과거 행을 'system' 으로 채우는 이유: 그래야 이 마이그레이션 이후에 남은 NULL 이
-- '출처를 모르는 옛 행' 이 아니라 '쓰기 경로가 안 채운 버그' 라는 뜻이 된다. 둘을 구분할 수 있어야 한다.
-- 대상 테이블 중 가장 큰 것이 8만 행대라 한 번에 돌려도 된다(2026-09-17 실측).

ALTER TABLE "alert_deliveries" ADD COLUMN "created_by" uuid;--> statement-breakpoint
ALTER TABLE "alert_deliveries" ADD COLUMN "created_source" text;--> statement-breakpoint
ALTER TABLE "alert_deliveries" ADD COLUMN "created_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "alert_deliveries" ADD COLUMN "updated_by" uuid;--> statement-breakpoint
ALTER TABLE "alert_deliveries" ADD COLUMN "updated_source" text;--> statement-breakpoint
ALTER TABLE "alert_deliveries" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "created_by" uuid;--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "created_source" text;--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "created_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "updated_by" uuid;--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "updated_source" text;--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "company_aliases" ADD COLUMN "created_by" uuid;--> statement-breakpoint
ALTER TABLE "company_aliases" ADD COLUMN "created_source" text;--> statement-breakpoint
ALTER TABLE "company_aliases" ADD COLUMN "created_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "company_aliases" ADD COLUMN "updated_by" uuid;--> statement-breakpoint
ALTER TABLE "company_aliases" ADD COLUMN "updated_source" text;--> statement-breakpoint
ALTER TABLE "company_aliases" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "data_corrections" ADD COLUMN "created_by" uuid;--> statement-breakpoint
ALTER TABLE "data_corrections" ADD COLUMN "created_source" text;--> statement-breakpoint
ALTER TABLE "data_corrections" ADD COLUMN "updated_by" uuid;--> statement-breakpoint
ALTER TABLE "data_corrections" ADD COLUMN "updated_source" text;--> statement-breakpoint
ALTER TABLE "data_corrections" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "discovery_ignores" ADD COLUMN "created_by" uuid;--> statement-breakpoint
ALTER TABLE "discovery_ignores" ADD COLUMN "created_source" text;--> statement-breakpoint
ALTER TABLE "discovery_ignores" ADD COLUMN "updated_by" uuid;--> statement-breakpoint
ALTER TABLE "discovery_ignores" ADD COLUMN "updated_source" text;--> statement-breakpoint
ALTER TABLE "discovery_ignores" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "game_aliases" ADD COLUMN "created_by" uuid;--> statement-breakpoint
ALTER TABLE "game_aliases" ADD COLUMN "created_source" text;--> statement-breakpoint
ALTER TABLE "game_aliases" ADD COLUMN "updated_by" uuid;--> statement-breakpoint
ALTER TABLE "game_aliases" ADD COLUMN "updated_source" text;--> statement-breakpoint
ALTER TABLE "game_aliases" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "game_companies" ADD COLUMN "created_by" uuid;--> statement-breakpoint
ALTER TABLE "game_companies" ADD COLUMN "created_source" text;--> statement-breakpoint
ALTER TABLE "game_companies" ADD COLUMN "created_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "game_companies" ADD COLUMN "updated_by" uuid;--> statement-breakpoint
ALTER TABLE "game_companies" ADD COLUMN "updated_source" text;--> statement-breakpoint
ALTER TABLE "game_companies" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "game_genres" ADD COLUMN "created_by" uuid;--> statement-breakpoint
ALTER TABLE "game_genres" ADD COLUMN "created_source" text;--> statement-breakpoint
ALTER TABLE "game_genres" ADD COLUMN "created_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "game_genres" ADD COLUMN "updated_by" uuid;--> statement-breakpoint
ALTER TABLE "game_genres" ADD COLUMN "updated_source" text;--> statement-breakpoint
ALTER TABLE "game_genres" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "game_platforms" ADD COLUMN "created_by" uuid;--> statement-breakpoint
ALTER TABLE "game_platforms" ADD COLUMN "created_source" text;--> statement-breakpoint
ALTER TABLE "game_platforms" ADD COLUMN "created_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "game_platforms" ADD COLUMN "updated_by" uuid;--> statement-breakpoint
ALTER TABLE "game_platforms" ADD COLUMN "updated_source" text;--> statement-breakpoint
ALTER TABLE "game_platforms" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "game_source_refs" ADD COLUMN "created_by" uuid;--> statement-breakpoint
ALTER TABLE "game_source_refs" ADD COLUMN "created_source" text;--> statement-breakpoint
ALTER TABLE "game_source_refs" ADD COLUMN "created_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "game_source_refs" ADD COLUMN "updated_by" uuid;--> statement-breakpoint
ALTER TABLE "game_source_refs" ADD COLUMN "updated_source" text;--> statement-breakpoint
ALTER TABLE "game_source_refs" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "game_subscriptions" ADD COLUMN "created_by" uuid;--> statement-breakpoint
ALTER TABLE "game_subscriptions" ADD COLUMN "created_source" text;--> statement-breakpoint
ALTER TABLE "game_subscriptions" ADD COLUMN "created_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "game_subscriptions" ADD COLUMN "updated_by" uuid;--> statement-breakpoint
ALTER TABLE "game_subscriptions" ADD COLUMN "updated_source" text;--> statement-breakpoint
ALTER TABLE "game_subscriptions" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "games" ADD COLUMN "created_by" uuid;--> statement-breakpoint
ALTER TABLE "games" ADD COLUMN "created_source" text;--> statement-breakpoint
ALTER TABLE "games" ADD COLUMN "updated_by" uuid;--> statement-breakpoint
ALTER TABLE "games" ADD COLUMN "updated_source" text;--> statement-breakpoint
ALTER TABLE "genres" ADD COLUMN "created_by" uuid;--> statement-breakpoint
ALTER TABLE "genres" ADD COLUMN "created_source" text;--> statement-breakpoint
ALTER TABLE "genres" ADD COLUMN "created_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "genres" ADD COLUMN "updated_by" uuid;--> statement-breakpoint
ALTER TABLE "genres" ADD COLUMN "updated_source" text;--> statement-breakpoint
ALTER TABLE "genres" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "news" ADD COLUMN "created_by" uuid;--> statement-breakpoint
ALTER TABLE "news" ADD COLUMN "created_source" text;--> statement-breakpoint
ALTER TABLE "news" ADD COLUMN "created_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "news" ADD COLUMN "updated_by" uuid;--> statement-breakpoint
ALTER TABLE "news" ADD COLUMN "updated_source" text;--> statement-breakpoint
ALTER TABLE "news" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "patch_notes" ADD COLUMN "created_by" uuid;--> statement-breakpoint
ALTER TABLE "patch_notes" ADD COLUMN "created_source" text;--> statement-breakpoint
ALTER TABLE "patch_notes" ADD COLUMN "created_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "patch_notes" ADD COLUMN "updated_by" uuid;--> statement-breakpoint
ALTER TABLE "patch_notes" ADD COLUMN "updated_source" text;--> statement-breakpoint
ALTER TABLE "patch_notes" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "playtimes" ADD COLUMN "created_by" uuid;--> statement-breakpoint
ALTER TABLE "playtimes" ADD COLUMN "created_source" text;--> statement-breakpoint
ALTER TABLE "playtimes" ADD COLUMN "created_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "playtimes" ADD COLUMN "updated_by" uuid;--> statement-breakpoint
ALTER TABLE "playtimes" ADD COLUMN "updated_source" text;--> statement-breakpoint
ALTER TABLE "playtimes" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "price_alerts" ADD COLUMN "created_by" uuid;--> statement-breakpoint
ALTER TABLE "price_alerts" ADD COLUMN "created_source" text;--> statement-breakpoint
ALTER TABLE "price_alerts" ADD COLUMN "created_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "price_alerts" ADD COLUMN "updated_by" uuid;--> statement-breakpoint
ALTER TABLE "price_alerts" ADD COLUMN "updated_source" text;--> statement-breakpoint
ALTER TABLE "price_alerts" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "price_snapshots" ADD COLUMN "created_by" uuid;--> statement-breakpoint
ALTER TABLE "price_snapshots" ADD COLUMN "created_source" text;--> statement-breakpoint
ALTER TABLE "price_snapshots" ADD COLUMN "created_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "price_snapshots" ADD COLUMN "updated_by" uuid;--> statement-breakpoint
ALTER TABLE "price_snapshots" ADD COLUMN "updated_source" text;--> statement-breakpoint
ALTER TABLE "price_snapshots" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "push_subscriptions" ADD COLUMN "created_by" uuid;--> statement-breakpoint
ALTER TABLE "push_subscriptions" ADD COLUMN "created_source" text;--> statement-breakpoint
ALTER TABLE "push_subscriptions" ADD COLUMN "updated_by" uuid;--> statement-breakpoint
ALTER TABLE "push_subscriptions" ADD COLUMN "updated_source" text;--> statement-breakpoint
ALTER TABLE "push_subscriptions" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "created_by" uuid;--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "created_source" text;--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "updated_by" uuid;--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "updated_source" text;--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD COLUMN "created_by" uuid;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD COLUMN "created_source" text;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD COLUMN "created_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD COLUMN "updated_by" uuid;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD COLUMN "updated_source" text;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "sync_logs" ADD COLUMN "created_by" uuid;--> statement-breakpoint
ALTER TABLE "sync_logs" ADD COLUMN "created_source" text;--> statement-breakpoint
ALTER TABLE "sync_logs" ADD COLUMN "created_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "sync_logs" ADD COLUMN "updated_by" uuid;--> statement-breakpoint
ALTER TABLE "sync_logs" ADD COLUMN "updated_source" text;--> statement-breakpoint
ALTER TABLE "sync_logs" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "upgrades" ADD COLUMN "created_by" uuid;--> statement-breakpoint
ALTER TABLE "upgrades" ADD COLUMN "created_source" text;--> statement-breakpoint
ALTER TABLE "upgrades" ADD COLUMN "created_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "upgrades" ADD COLUMN "updated_by" uuid;--> statement-breakpoint
ALTER TABLE "upgrades" ADD COLUMN "updated_source" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "created_by" uuid;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "created_source" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "updated_by" uuid;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "updated_source" text;--> statement-breakpoint
ALTER TABLE "wishlists" ADD COLUMN "created_by" uuid;--> statement-breakpoint
ALTER TABLE "wishlists" ADD COLUMN "created_source" text;--> statement-breakpoint
ALTER TABLE "wishlists" ADD COLUMN "updated_by" uuid;--> statement-breakpoint
ALTER TABLE "wishlists" ADD COLUMN "updated_source" text;--> statement-breakpoint
ALTER TABLE "wishlists" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;

UPDATE "alert_deliveries" SET "created_source" = 'system', "updated_source" = 'system' WHERE "created_source" IS NULL;--> statement-breakpoint
UPDATE "companies" SET "created_source" = 'system', "updated_source" = 'system' WHERE "created_source" IS NULL;--> statement-breakpoint
UPDATE "company_aliases" SET "created_source" = 'system', "updated_source" = 'system' WHERE "created_source" IS NULL;--> statement-breakpoint
UPDATE "data_corrections" SET "created_source" = 'system', "updated_source" = 'system' WHERE "created_source" IS NULL;--> statement-breakpoint
UPDATE "discovery_ignores" SET "created_source" = 'system', "updated_source" = 'system' WHERE "created_source" IS NULL;--> statement-breakpoint
UPDATE "game_aliases" SET "created_source" = 'system', "updated_source" = 'system' WHERE "created_source" IS NULL;--> statement-breakpoint
UPDATE "game_companies" SET "created_source" = 'system', "updated_source" = 'system' WHERE "created_source" IS NULL;--> statement-breakpoint
UPDATE "game_genres" SET "created_source" = 'system', "updated_source" = 'system' WHERE "created_source" IS NULL;--> statement-breakpoint
UPDATE "game_platforms" SET "created_source" = 'system', "updated_source" = 'system' WHERE "created_source" IS NULL;--> statement-breakpoint
UPDATE "game_source_refs" SET "created_source" = 'system', "updated_source" = 'system' WHERE "created_source" IS NULL;--> statement-breakpoint
UPDATE "game_subscriptions" SET "created_source" = 'system', "updated_source" = 'system' WHERE "created_source" IS NULL;--> statement-breakpoint
UPDATE "games" SET "created_source" = 'system', "updated_source" = 'system' WHERE "created_source" IS NULL;--> statement-breakpoint
UPDATE "genres" SET "created_source" = 'system', "updated_source" = 'system' WHERE "created_source" IS NULL;--> statement-breakpoint
UPDATE "news" SET "created_source" = 'system', "updated_source" = 'system' WHERE "created_source" IS NULL;--> statement-breakpoint
UPDATE "patch_notes" SET "created_source" = 'system', "updated_source" = 'system' WHERE "created_source" IS NULL;--> statement-breakpoint
UPDATE "playtimes" SET "created_source" = 'system', "updated_source" = 'system' WHERE "created_source" IS NULL;--> statement-breakpoint
UPDATE "price_alerts" SET "created_source" = 'system', "updated_source" = 'system' WHERE "created_source" IS NULL;--> statement-breakpoint
UPDATE "price_snapshots" SET "created_source" = 'system', "updated_source" = 'system' WHERE "created_source" IS NULL;--> statement-breakpoint
UPDATE "push_subscriptions" SET "created_source" = 'system', "updated_source" = 'system' WHERE "created_source" IS NULL;--> statement-breakpoint
UPDATE "sessions" SET "created_source" = 'system', "updated_source" = 'system' WHERE "created_source" IS NULL;--> statement-breakpoint
UPDATE "subscriptions" SET "created_source" = 'system', "updated_source" = 'system' WHERE "created_source" IS NULL;--> statement-breakpoint
UPDATE "sync_logs" SET "created_source" = 'system', "updated_source" = 'system' WHERE "created_source" IS NULL;--> statement-breakpoint
UPDATE "upgrades" SET "created_source" = 'system', "updated_source" = 'system' WHERE "created_source" IS NULL;--> statement-breakpoint
UPDATE "users" SET "created_source" = 'system', "updated_source" = 'system' WHERE "created_source" IS NULL;--> statement-breakpoint
UPDATE "wishlists" SET "created_source" = 'system', "updated_source" = 'system' WHERE "created_source" IS NULL;
