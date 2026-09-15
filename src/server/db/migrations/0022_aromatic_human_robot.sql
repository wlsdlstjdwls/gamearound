ALTER TABLE "patch_notes" ADD COLUMN "title_ko" text;--> statement-breakpoint
ALTER TABLE "patch_notes" ADD COLUMN "summary_ko" text;--> statement-breakpoint
ALTER TABLE "patch_notes" ADD COLUMN "summary_model" text;--> statement-breakpoint
ALTER TABLE "patch_notes" ADD COLUMN "summarized_at" timestamp with time zone;