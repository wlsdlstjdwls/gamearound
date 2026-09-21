CREATE TYPE "public"."admin_task_priority" AS ENUM('high', 'normal', 'low');--> statement-breakpoint
CREATE TYPE "public"."admin_task_status" AS ENUM('backlog', 'todo', 'doing', 'done');--> statement-breakpoint
CREATE TABLE "admin_tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"body" text,
	"status" "admin_task_status" DEFAULT 'todo' NOT NULL,
	"priority" "admin_task_priority" DEFAULT 'normal' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"due_at" timestamp with time zone,
	"done_at" timestamp with time zone,
	"game_id" uuid,
	"shop_id" uuid,
	"source" "source",
	"created_by" uuid,
	"created_source" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	"updated_source" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "admin_tasks" ADD CONSTRAINT "admin_tasks_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admin_tasks" ADD CONSTRAINT "admin_tasks_shop_id_shops_id_fk" FOREIGN KEY ("shop_id") REFERENCES "public"."shops"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "admin_tasks_board_idx" ON "admin_tasks" USING btree ("status","sort_order");--> statement-breakpoint
CREATE INDEX "admin_tasks_game_idx" ON "admin_tasks" USING btree ("game_id") WHERE game_id is not null;