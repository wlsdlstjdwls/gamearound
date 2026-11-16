ALTER TABLE "game_platforms" ADD COLUMN "perf_features" text[];--> statement-breakpoint
ALTER TABLE "game_platforms" ADD COLUMN "perf_checked_at" timestamp with time zone;
