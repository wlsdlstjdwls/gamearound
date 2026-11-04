CREATE TABLE "admin_plan_attachments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"plan_item_id" uuid NOT NULL,
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
ALTER TABLE "admin_plan_attachments" ADD CONSTRAINT "admin_plan_attachments_plan_item_id_admin_plan_items_id_fk" FOREIGN KEY ("plan_item_id") REFERENCES "public"."admin_plan_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "admin_plan_attachments_item_idx" ON "admin_plan_attachments" USING btree ("plan_item_id","created_at");