ALTER TABLE "game_source_refs" ADD COLUMN "missing_streak" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "game_source_refs" ADD COLUMN "missing_at" timestamp with time zone;