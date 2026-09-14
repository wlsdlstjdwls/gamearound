ALTER TYPE "public"."source" ADD VALUE 'wikidata_game' BEFORE 'gamepass';--> statement-breakpoint
ALTER TABLE "game_aliases" ADD COLUMN "source" "source" DEFAULT 'manual' NOT NULL;