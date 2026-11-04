CREATE TYPE "public"."admin_plan_kind" AS ENUM('task', 'milestone');--> statement-breakpoint
CREATE TYPE "public"."admin_plan_track" AS ENUM('dev', 'plan', 'sales');--> statement-breakpoint
CREATE TABLE "admin_plan_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"parent_id" uuid,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"title" text NOT NULL,
	"track" "admin_plan_track" DEFAULT 'dev' NOT NULL,
	"kind" "admin_plan_kind" DEFAULT 'task' NOT NULL,
	"start_on" date,
	"end_on" date,
	"progress" integer,
	"assignee_id" uuid,
	"output" text,
	"memo" text,
	"created_by" uuid,
	"created_source" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	"updated_source" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "admin_tasks" ADD COLUMN "plan_item_id" uuid;--> statement-breakpoint
ALTER TABLE "admin_plan_items" ADD CONSTRAINT "admin_plan_items_parent_id_admin_plan_items_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."admin_plan_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admin_plan_items" ADD CONSTRAINT "admin_plan_items_assignee_id_users_id_fk" FOREIGN KEY ("assignee_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "admin_plan_items_order_idx" ON "admin_plan_items" USING btree ("parent_id","sort_order");--> statement-breakpoint
ALTER TABLE "admin_tasks" ADD CONSTRAINT "admin_tasks_plan_item_id_admin_plan_items_id_fk" FOREIGN KEY ("plan_item_id") REFERENCES "public"."admin_plan_items"("id") ON DELETE set null ON UPDATE no action;