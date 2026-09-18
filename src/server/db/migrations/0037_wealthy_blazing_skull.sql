ALTER TABLE "games" DROP CONSTRAINT "games_parent_game_id_games_id_fk";
--> statement-breakpoint
ALTER TABLE "games" ADD CONSTRAINT "games_parent_game_id_games_id_fk" FOREIGN KEY ("parent_game_id") REFERENCES "public"."games"("id") ON DELETE set null ON UPDATE no action;