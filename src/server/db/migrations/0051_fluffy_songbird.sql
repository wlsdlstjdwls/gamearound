CREATE TABLE "admin_task_attachments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"task_id" uuid NOT NULL,
	"note_id" uuid,
	"url" text NOT NULL,
	"pathname" text NOT NULL,
	"name" text NOT NULL,
	"content_type" text NOT NULL,
	"byte_size" integer NOT NULL,
	"created_by" uuid,
	"created_source" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	"updated_source" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "admin_task_attachments" ADD CONSTRAINT "admin_task_attachments_task_id_admin_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."admin_tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admin_task_attachments" ADD CONSTRAINT "admin_task_attachments_note_id_admin_task_notes_id_fk" FOREIGN KEY ("note_id") REFERENCES "public"."admin_task_notes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "admin_task_attachments_task_idx" ON "admin_task_attachments" USING btree ("task_id","created_at");