ALTER TYPE "public"."notification_kind" ADD VALUE 'payment';--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "refunded_amount" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "refunded_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "refund_reason" text;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "refund_requested_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "refund_request_note" text;