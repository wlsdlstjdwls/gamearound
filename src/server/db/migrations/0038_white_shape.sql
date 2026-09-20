ALTER TABLE "game_platforms" ADD COLUMN "popularity_rank" integer;--> statement-breakpoint
ALTER TABLE "game_platforms" ADD COLUMN "popularity_rank_at" timestamp with time zone;--> statement-breakpoint
CREATE INDEX "gp_popularity_rank_idx" ON "game_platforms" USING btree ("popularity_rank") WHERE "game_platforms"."popularity_rank" is not null;