ALTER TABLE "game_platforms" ALTER COLUMN "platform" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "game_requirements" ALTER COLUMN "platform" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "price_alerts" ALTER COLUMN "platform" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "subscriptions" ALTER COLUMN "platform" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "upgrades" ALTER COLUMN "from_platform" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "upgrades" ALTER COLUMN "to_platform" SET DATA TYPE text;--> statement-breakpoint
DROP TYPE "public"."platform";--> statement-breakpoint
CREATE TYPE "public"."platform" AS ENUM('steam', 'ps5', 'ps4', 'xbox', 'switch', 'switch2', 'epic');--> statement-breakpoint
ALTER TABLE "game_platforms" ALTER COLUMN "platform" SET DATA TYPE "public"."platform" USING "platform"::"public"."platform";--> statement-breakpoint
ALTER TABLE "game_requirements" ALTER COLUMN "platform" SET DATA TYPE "public"."platform" USING "platform"::"public"."platform";--> statement-breakpoint
ALTER TABLE "price_alerts" ALTER COLUMN "platform" SET DATA TYPE "public"."platform" USING "platform"::"public"."platform";--> statement-breakpoint
ALTER TABLE "subscriptions" ALTER COLUMN "platform" SET DATA TYPE "public"."platform" USING "platform"::"public"."platform";--> statement-breakpoint
ALTER TABLE "upgrades" ALTER COLUMN "from_platform" SET DATA TYPE "public"."platform" USING "from_platform"::"public"."platform";--> statement-breakpoint
ALTER TABLE "upgrades" ALTER COLUMN "to_platform" SET DATA TYPE "public"."platform" USING "to_platform"::"public"."platform";--> statement-breakpoint
ALTER TABLE "company_aliases" ALTER COLUMN "source" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "discovery_ignores" ALTER COLUMN "source" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "game_aliases" ALTER COLUMN "source" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "game_aliases" ALTER COLUMN "source" SET DEFAULT 'manual'::text;--> statement-breakpoint
ALTER TABLE "game_source_refs" ALTER COLUMN "source" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "patch_notes" ALTER COLUMN "source" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "sync_logs" ALTER COLUMN "source" SET DATA TYPE text;--> statement-breakpoint
DROP TYPE "public"."source";--> statement-breakpoint
CREATE TYPE "public"."source" AS ENUM('steam', 'psstore', 'xbox', 'nintendo', 'nintendo_jp', 'hltb', 'opencritic', 'metacritic', 'rss', 'manual', 'wikidata', 'wikidata_game', 'gamepass', 'epic');--> statement-breakpoint
ALTER TABLE "company_aliases" ALTER COLUMN "source" SET DATA TYPE "public"."source" USING "source"::"public"."source";--> statement-breakpoint
ALTER TABLE "discovery_ignores" ALTER COLUMN "source" SET DATA TYPE "public"."source" USING "source"::"public"."source";--> statement-breakpoint
ALTER TABLE "game_aliases" ALTER COLUMN "source" SET DEFAULT 'manual'::"public"."source";--> statement-breakpoint
ALTER TABLE "game_aliases" ALTER COLUMN "source" SET DATA TYPE "public"."source" USING "source"::"public"."source";--> statement-breakpoint
ALTER TABLE "game_source_refs" ALTER COLUMN "source" SET DATA TYPE "public"."source" USING "source"::"public"."source";--> statement-breakpoint
ALTER TABLE "patch_notes" ALTER COLUMN "source" SET DATA TYPE "public"."source" USING "source"::"public"."source";--> statement-breakpoint
ALTER TABLE "sync_logs" ALTER COLUMN "source" SET DATA TYPE "public"."source" USING "source"::"public"."source";