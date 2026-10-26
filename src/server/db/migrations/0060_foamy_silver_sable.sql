CREATE TYPE "public"."alert_channel" AS ENUM('web', 'email');--> statement-breakpoint
ALTER TABLE "price_alerts" ADD COLUMN "channel" "alert_channel" DEFAULT 'web' NOT NULL;