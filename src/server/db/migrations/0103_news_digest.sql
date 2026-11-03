ALTER TYPE "public"."notification_kind" ADD VALUE 'news';--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "news_digest_on_at" timestamp with time zone;