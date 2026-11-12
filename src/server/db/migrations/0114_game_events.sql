CREATE TABLE "game_event_checks" (
	"game_id" uuid NOT NULL,
	"source" text NOT NULL,
	"checked_at" timestamp with time zone NOT NULL,
	"created_by" uuid,
	"created_source" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	"updated_source" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "game_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"game_id" uuid NOT NULL,
	"source" text NOT NULL,
	"source_key" text NOT NULL,
	"kind" text NOT NULL,
	"url" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"image_url" text,
	"published_at" timestamp with time zone,
	"starts_at" timestamp with time zone,
	"ends_at" timestamp with time zone,
	"hidden" boolean DEFAULT false NOT NULL,
	"created_by" uuid,
	"created_source" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	"updated_source" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "game_event_checks" ADD CONSTRAINT "game_event_checks_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_events" ADD CONSTRAINT "game_events_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "game_event_checks_uq" ON "game_event_checks" USING btree ("game_id","source");--> statement-breakpoint
CREATE UNIQUE INDEX "game_events_source_key_game_uq" ON "game_events" USING btree ("source","source_key","game_id");--> statement-breakpoint
CREATE INDEX "game_events_game_idx" ON "game_events" USING btree ("game_id","published_at");