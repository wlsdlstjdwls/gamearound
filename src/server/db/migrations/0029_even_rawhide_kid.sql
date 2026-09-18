CREATE TYPE "public"."part_kind" AS ENUM('cpu', 'gpu');--> statement-breakpoint
CREATE TABLE "game_requirement_parts" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "game_requirement_parts_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"requirement_id" integer NOT NULL,
	"kind" "part_kind" NOT NULL,
	"raw_text" text NOT NULL,
	"model_key" text,
	"tier" integer,
	"vram_mb" integer,
	"is_alternative" boolean DEFAULT false NOT NULL,
	"match_version" integer NOT NULL,
	"created_by" uuid,
	"created_source" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	"updated_source" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "game_requirement_parts" ADD CONSTRAINT "game_requirement_parts_requirement_id_game_requirements_id_fk" FOREIGN KEY ("requirement_id") REFERENCES "public"."game_requirements"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "grp_requirement_idx" ON "game_requirement_parts" USING btree ("requirement_id");--> statement-breakpoint
CREATE INDEX "grp_kind_tier_idx" ON "game_requirement_parts" USING btree ("kind","tier");