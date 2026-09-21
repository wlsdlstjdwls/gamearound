CREATE TYPE "public"."admin_task_note_kind" AS ENUM('note', 'move');--> statement-breakpoint
CREATE TABLE "admin_task_notes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"task_id" uuid NOT NULL,
	"kind" "admin_task_note_kind" DEFAULT 'note' NOT NULL,
	"body" text,
	"from_status" "admin_task_status",
	"to_status" "admin_task_status",
	"created_by" uuid,
	"created_source" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	"updated_source" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "admin_task_notes" ADD CONSTRAINT "admin_task_notes_task_id_admin_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."admin_tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "admin_task_notes_task_idx" ON "admin_task_notes" USING btree ("task_id","created_at");