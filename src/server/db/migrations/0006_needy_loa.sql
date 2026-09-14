-- 회사(F1, F2, F4), DLC(F5), 구독(F7), 세대 업그레이드(F6) 스키마.
-- ALTER TYPE ... ADD VALUE 는 같은 트랜잭션에서 그 값을 '사용'하지 않으면 PG12+ 에서 허용된다.
-- 아래 DDL 은 새 값(wikidata, gamepass)을 쓰지 않으므로 한 마이그레이션에 같이 둬도 된다.
CREATE TYPE "public"."company_role" AS ENUM('developer', 'publisher');--> statement-breakpoint
CREATE TYPE "public"."content_type" AS ENUM('game', 'dlc', 'edition', 'bundle');--> statement-breakpoint
CREATE TYPE "public"."upgrade_kind" AS ENUM('free', 'paid', 'subscription_included');--> statement-breakpoint
ALTER TYPE "public"."source" ADD VALUE 'wikidata';--> statement-breakpoint
ALTER TYPE "public"."source" ADD VALUE 'gamepass';--> statement-breakpoint
CREATE TABLE "companies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name_en" text NOT NULL,
	"name_ko" text,
	"country_code" text,
	"country_name_ko" text,
	"founded_at" date,
	"hq_name_ko" text,
	"website_url" text,
	"description" text,
	"wikidata_id" text,
	"last_synced_at" timestamp with time zone,
	CONSTRAINT "companies_slug_unique" UNIQUE("slug"),
	CONSTRAINT "companies_wikidata_id_unique" UNIQUE("wikidata_id")
);
--> statement-breakpoint
CREATE TABLE "company_aliases" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "company_aliases_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"company_id" uuid NOT NULL,
	"alias_norm" text NOT NULL,
	"alias_raw" text NOT NULL,
	"source" "source" NOT NULL,
	CONSTRAINT "company_aliases_alias_norm_unique" UNIQUE("alias_norm")
);
--> statement-breakpoint
CREATE TABLE "game_companies" (
	"game_id" uuid NOT NULL,
	"company_id" uuid NOT NULL,
	"role" "company_role" NOT NULL,
	CONSTRAINT "game_companies_game_id_company_id_role_pk" PRIMARY KEY("game_id","company_id","role")
);
--> statement-breakpoint
CREATE TABLE "game_subscriptions" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "game_subscriptions_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"game_platform_id" uuid NOT NULL,
	"subscription_id" integer NOT NULL,
	"added_at" timestamp with time zone DEFAULT now() NOT NULL,
	"removed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "subscriptions" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "subscriptions_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"key" text NOT NULL,
	"label_ko" text NOT NULL,
	"platform" "platform" NOT NULL,
	"catalog_id" text,
	"is_active" boolean DEFAULT true NOT NULL,
	CONSTRAINT "subscriptions_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "upgrades" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "upgrades_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"game_id" uuid NOT NULL,
	"from_platform" "platform" NOT NULL,
	"to_platform" "platform" NOT NULL,
	"kind" "upgrade_kind" NOT NULL,
	"price" integer,
	"store_external_id" text,
	"store_url" text,
	"note" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "game_platforms" ADD COLUMN "has_add_ons" boolean;--> statement-breakpoint
ALTER TABLE "games" ADD COLUMN "content_type" "content_type" DEFAULT 'game' NOT NULL;--> statement-breakpoint
ALTER TABLE "games" ADD COLUMN "parent_game_id" uuid;--> statement-breakpoint
ALTER TABLE "company_aliases" ADD CONSTRAINT "company_aliases_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_companies" ADD CONSTRAINT "game_companies_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_companies" ADD CONSTRAINT "game_companies_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_subscriptions" ADD CONSTRAINT "game_subscriptions_game_platform_id_game_platforms_id_fk" FOREIGN KEY ("game_platform_id") REFERENCES "public"."game_platforms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_subscriptions" ADD CONSTRAINT "game_subscriptions_subscription_id_subscriptions_id_fk" FOREIGN KEY ("subscription_id") REFERENCES "public"."subscriptions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "upgrades" ADD CONSTRAINT "upgrades_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "companies_country_idx" ON "companies" USING btree ("country_code");--> statement-breakpoint
CREATE INDEX "gc_company_role_idx" ON "game_companies" USING btree ("company_id","role");--> statement-breakpoint
CREATE INDEX "gs_sub_removed_idx" ON "game_subscriptions" USING btree ("subscription_id","removed_at");--> statement-breakpoint
CREATE INDEX "gs_gp_idx" ON "game_subscriptions" USING btree ("game_platform_id");--> statement-breakpoint
CREATE UNIQUE INDEX "upgrades_game_from_to_uq" ON "upgrades" USING btree ("game_id","from_platform","to_platform");--> statement-breakpoint
ALTER TABLE "games" ADD CONSTRAINT "games_parent_game_id_games_id_fk" FOREIGN KEY ("parent_game_id") REFERENCES "public"."games"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "games_content_parent_idx" ON "games" USING btree ("content_type","parent_game_id");