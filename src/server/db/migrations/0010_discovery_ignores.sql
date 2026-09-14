CREATE TABLE "discovery_ignores" (
	"source" "source" NOT NULL,
	"external_id" text NOT NULL,
	"game_id" uuid,
	"reason" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "discovery_ignores_source_external_id_pk" PRIMARY KEY("source","external_id")
);
--> statement-breakpoint
ALTER TABLE "discovery_ignores" ADD CONSTRAINT "discovery_ignores_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE cascade ON UPDATE no action;