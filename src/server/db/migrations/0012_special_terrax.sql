CREATE TYPE "public"."region" AS ENUM('KR', 'JP');--> statement-breakpoint
ALTER TYPE "public"."currency" ADD VALUE 'JPY';--> statement-breakpoint
ALTER TYPE "public"."source" ADD VALUE 'nintendo_jp' BEFORE 'hltb';--> statement-breakpoint
DROP INDEX "gp_game_platform_uq";--> statement-breakpoint
ALTER TABLE "game_platforms" ADD COLUMN "region" "region" DEFAULT 'KR' NOT NULL;--> statement-breakpoint
ALTER TABLE "game_platforms" ADD COLUMN "title_code" text;--> statement-breakpoint
CREATE UNIQUE INDEX "gp_game_platform_region_uq" ON "game_platforms" USING btree ("game_id","platform","region");--> statement-breakpoint
CREATE INDEX "gp_title_code_idx" ON "game_platforms" USING btree ("title_code");