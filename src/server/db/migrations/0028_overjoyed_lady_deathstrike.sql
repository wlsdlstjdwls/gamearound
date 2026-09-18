CREATE TYPE "public"."os_family" AS ENUM('windows', 'mac', 'linux');--> statement-breakpoint
CREATE TYPE "public"."requirement_tier" AS ENUM('minimum', 'recommended');--> statement-breakpoint
CREATE TABLE "game_requirements" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "game_requirements_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"game_id" uuid NOT NULL,
	"platform" "platform" NOT NULL,
	"os_family" "os_family" NOT NULL,
	"tier" "requirement_tier" NOT NULL,
	"raw_html" text NOT NULL,
	"os_text" text,
	"cpu_text" text,
	"gpu_text" text,
	"directx_text" text,
	"note_text" text,
	"ram_mb" integer,
	"vram_mb" integer,
	"storage_mb" integer,
	"parse_version" integer NOT NULL,
	"parse_confidence" numeric(3, 2),
	"created_by" uuid,
	"created_source" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	"updated_source" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "game_platforms" ADD COLUMN "requirements_listed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "game_requirements" ADD CONSTRAINT "game_requirements_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "gr_game_platform_os_tier_uq" ON "game_requirements" USING btree ("game_id","platform","os_family","tier");