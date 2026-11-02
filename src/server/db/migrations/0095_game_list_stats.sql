CREATE TABLE "game_list_stats" (
	"game_id" uuid PRIMARY KEY NOT NULL,
	"max_discount" integer NOT NULL,
	"has_base_currency" boolean NOT NULL,
	"min_price" integer,
	"max_release" date,
	"max_reviews" integer,
	"ko_text" boolean,
	"has_paid_price" boolean,
	"min_rank" integer,
	"created_by" uuid,
	"created_source" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	"updated_source" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "game_list_stats" ADD CONSTRAINT "game_list_stats_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE cascade ON UPDATE no action;