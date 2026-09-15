CREATE TYPE "public"."user_score_kind" AS ENUM('positive_ratio', 'star_average');--> statement-breakpoint
ALTER TABLE "game_platforms" ADD COLUMN "user_score" integer;--> statement-breakpoint
ALTER TABLE "game_platforms" ADD COLUMN "user_score_kind" "user_score_kind";--> statement-breakpoint
ALTER TABLE "game_platforms" ADD COLUMN "user_score_count" integer;