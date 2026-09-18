ALTER TABLE "products" ADD COLUMN "game_match_checked_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "game_match_suggested_id" uuid;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "game_match_confidence" numeric(3, 2);--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_game_match_suggested_id_games_id_fk" FOREIGN KEY ("game_match_suggested_id") REFERENCES "public"."games"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "products_match_queue_idx" ON "products" USING btree ("game_match_checked_at") WHERE game_id is null;