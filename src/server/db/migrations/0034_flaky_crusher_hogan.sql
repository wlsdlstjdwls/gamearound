CREATE TYPE "public"."game_origin" AS ENUM('crawler', 'shop', 'admin');--> statement-breakpoint
CREATE TYPE "public"."game_visibility" AS ENUM('public', 'shop_only');--> statement-breakpoint
ALTER TABLE "games" ADD COLUMN "origin" "game_origin" DEFAULT 'crawler' NOT NULL;--> statement-breakpoint
ALTER TABLE "games" ADD COLUMN "visibility" "game_visibility" DEFAULT 'public' NOT NULL;--> statement-breakpoint
ALTER TABLE "games" ADD COLUMN "crawl_excluded" boolean DEFAULT false NOT NULL;--> statement-breakpoint
CREATE INDEX "games_shop_origin_idx" ON "games" USING btree ("origin") WHERE origin <> 'crawler';