CREATE TYPE "public"."deck_compat" AS ENUM('verified', 'playable', 'unsupported');--> statement-breakpoint
ALTER TABLE "game_platforms" ADD COLUMN "steam_deck_compat" "deck_compat";--> statement-breakpoint
ALTER TABLE "game_platforms" ADD COLUMN "native_windows" boolean;--> statement-breakpoint
ALTER TABLE "game_platforms" ADD COLUMN "native_mac" boolean;--> statement-breakpoint
ALTER TABLE "game_platforms" ADD COLUMN "native_linux" boolean;