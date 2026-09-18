CREATE TABLE "game_requirement_floors" (
	"game_id" uuid NOT NULL,
	"os_family" "os_family" NOT NULL,
	"min_cpu_tier" integer,
	"min_gpu_tier" integer,
	"min_ram_mb" integer,
	"min_storage_mb" integer,
	"rec_cpu_tier" integer,
	"rec_gpu_tier" integer,
	"rec_ram_mb" integer,
	"rec_storage_mb" integer,
	"match_version" integer NOT NULL,
	"created_by" uuid,
	"created_source" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	"updated_source" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "game_requirement_floors_game_id_os_family_pk" PRIMARY KEY("game_id","os_family")
);
--> statement-breakpoint
ALTER TABLE "game_requirement_floors" ADD CONSTRAINT "game_requirement_floors_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "grf_os_tiers_idx" ON "game_requirement_floors" USING btree ("os_family","min_gpu_tier","min_cpu_tier");