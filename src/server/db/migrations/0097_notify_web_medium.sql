ALTER TYPE "public"."notification_kind" ADD VALUE 'notice';--> statement-breakpoint
ALTER TYPE "public"."notify_medium" ADD VALUE 'web';--> statement-breakpoint
ALTER TABLE "notifications" ADD COLUMN "template_code" text;