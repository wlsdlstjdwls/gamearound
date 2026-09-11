CREATE TYPE "public"."platform" AS ENUM('steam', 'ps5', 'ps4', 'xbox', 'switch', 'switch2');--> statement-breakpoint
CREATE TYPE "public"."role" AS ENUM('user', 'game_company', 'seller', 'admin');--> statement-breakpoint
CREATE TYPE "public"."source" AS ENUM('steam', 'psstore', 'xbox', 'nintendo', 'hltb', 'opencritic', 'metacritic', 'rss', 'manual');--> statement-breakpoint
CREATE TYPE "public"."sync_status" AS ENUM('ok', 'partial', 'failed');--> statement-breakpoint
CREATE TABLE "alert_deliveries" (
	"alert_id" uuid NOT NULL,
	"snapshot_id" integer NOT NULL,
	"sent_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "alert_deliveries_alert_id_snapshot_id_pk" PRIMARY KEY("alert_id","snapshot_id")
);
--> statement-breakpoint
CREATE TABLE "data_corrections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"admin_user_id" uuid NOT NULL,
	"table" text NOT NULL,
	"row_id" text NOT NULL,
	"field" text NOT NULL,
	"before" jsonb,
	"after" jsonb,
	"lock_field" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "game_genres" (
	"game_id" uuid NOT NULL,
	"genre_id" integer NOT NULL,
	CONSTRAINT "game_genres_game_id_genre_id_pk" PRIMARY KEY("game_id","genre_id")
);
--> statement-breakpoint
CREATE TABLE "game_platforms" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"game_id" uuid NOT NULL,
	"platform" "platform" NOT NULL,
	"store_external_id" text,
	"store_url" text,
	"release_date" date,
	"current_version" text,
	"list_price" integer,
	"current_price" integer,
	"discount_pct" integer,
	"metacritic_score" integer,
	"opencritic_score" integer,
	"last_synced_at" timestamp,
	"sync_status" "sync_status" DEFAULT 'ok'
);
--> statement-breakpoint
CREATE TABLE "game_source_refs" (
	"game_id" uuid NOT NULL,
	"source" "source" NOT NULL,
	"external_id" text NOT NULL,
	"url" text,
	"matched_by" text NOT NULL,
	"confidence" numeric(3, 2),
	CONSTRAINT "game_source_refs_game_id_source_pk" PRIMARY KEY("game_id","source")
);
--> statement-breakpoint
CREATE TABLE "games" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"title_ko" text,
	"title_en" text NOT NULL,
	"description" text,
	"cover_url" text,
	"developer" text,
	"publisher" text,
	"local_max_players" integer,
	"online_max_players" integer,
	"supports_solo" boolean DEFAULT true,
	"supports_coop" boolean DEFAULT false,
	"supports_pvp" boolean DEFAULT false,
	"is_retro" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "games_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "genres" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "genres_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"name" text NOT NULL,
	CONSTRAINT "genres_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "news" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"game_id" uuid,
	"title" text NOT NULL,
	"url" text NOT NULL,
	"source_name" text NOT NULL,
	"thumbnail_url" text,
	"published_at" timestamp NOT NULL,
	CONSTRAINT "news_url_unique" UNIQUE("url")
);
--> statement-breakpoint
CREATE TABLE "playtimes" (
	"game_id" uuid PRIMARY KEY NOT NULL,
	"main_story_hours" numeric(5, 1),
	"main_extra_hours" numeric(5, 1),
	"completionist_hours" numeric(5, 1),
	"last_synced_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "price_alerts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"game_id" uuid NOT NULL,
	"platform" "platform",
	"min_discount_pct" integer DEFAULT 1,
	"is_active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "price_snapshots" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "price_snapshots_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"game_platform_id" uuid NOT NULL,
	"price" integer NOT NULL,
	"discount_pct" integer DEFAULT 0,
	"captured_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "push_subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"endpoint" text NOT NULL,
	"p256dh" text NOT NULL,
	"auth" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "push_subscriptions_endpoint_unique" UNIQUE("endpoint")
);
--> statement-breakpoint
CREATE TABLE "sync_logs" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "sync_logs_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"source" "source" NOT NULL,
	"status" "sync_status" NOT NULL,
	"processed" integer DEFAULT 0,
	"failed" integer DEFAULT 0,
	"error_sample" text,
	"started_at" timestamp NOT NULL,
	"finished_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clerk_id" text NOT NULL,
	"role" "role" DEFAULT 'user' NOT NULL,
	"display_name" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_clerk_id_unique" UNIQUE("clerk_id")
);
--> statement-breakpoint
CREATE TABLE "wishlists" (
	"user_id" uuid NOT NULL,
	"game_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "wishlists_user_id_game_id_pk" PRIMARY KEY("user_id","game_id")
);
--> statement-breakpoint
ALTER TABLE "alert_deliveries" ADD CONSTRAINT "alert_deliveries_alert_id_price_alerts_id_fk" FOREIGN KEY ("alert_id") REFERENCES "public"."price_alerts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alert_deliveries" ADD CONSTRAINT "alert_deliveries_snapshot_id_price_snapshots_id_fk" FOREIGN KEY ("snapshot_id") REFERENCES "public"."price_snapshots"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "data_corrections" ADD CONSTRAINT "data_corrections_admin_user_id_users_id_fk" FOREIGN KEY ("admin_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_genres" ADD CONSTRAINT "game_genres_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_genres" ADD CONSTRAINT "game_genres_genre_id_genres_id_fk" FOREIGN KEY ("genre_id") REFERENCES "public"."genres"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_platforms" ADD CONSTRAINT "game_platforms_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_source_refs" ADD CONSTRAINT "game_source_refs_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "news" ADD CONSTRAINT "news_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "playtimes" ADD CONSTRAINT "playtimes_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "price_alerts" ADD CONSTRAINT "price_alerts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "price_alerts" ADD CONSTRAINT "price_alerts_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "price_snapshots" ADD CONSTRAINT "price_snapshots_game_platform_id_game_platforms_id_fk" FOREIGN KEY ("game_platform_id") REFERENCES "public"."game_platforms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "push_subscriptions" ADD CONSTRAINT "push_subscriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wishlists" ADD CONSTRAINT "wishlists_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wishlists" ADD CONSTRAINT "wishlists_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "gp_game_platform_uq" ON "game_platforms" USING btree ("game_id","platform");--> statement-breakpoint
CREATE INDEX "games_title_en_idx" ON "games" USING btree ("title_en");--> statement-breakpoint
CREATE INDEX "news_game_pub_idx" ON "news" USING btree ("game_id","published_at");--> statement-breakpoint
CREATE INDEX "pa_game_active_idx" ON "price_alerts" USING btree ("game_id","is_active");--> statement-breakpoint
CREATE INDEX "ps_gp_captured_idx" ON "price_snapshots" USING btree ("game_platform_id","captured_at");