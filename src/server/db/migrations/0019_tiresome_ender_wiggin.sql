CREATE TABLE "patch_notes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"game_platform_id" uuid NOT NULL,
	"source" "source" NOT NULL,
	"external_id" text NOT NULL,
	"version" text,
	"title" text NOT NULL,
	"url" text,
	"published_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "game_platforms" ADD COLUMN "patch_listed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "patch_notes" ADD CONSTRAINT "patch_notes_game_platform_id_game_platforms_id_fk" FOREIGN KEY ("game_platform_id") REFERENCES "public"."game_platforms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "patch_notes_platform_external_uq" ON "patch_notes" USING btree ("game_platform_id","external_id");--> statement-breakpoint
CREATE INDEX "patch_notes_platform_pub_idx" ON "patch_notes" USING btree ("game_platform_id","published_at");