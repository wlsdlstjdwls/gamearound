CREATE TYPE "public"."promo_slot" AS ENUM('indie_top', 'promo_pin');--> statement-breakpoint
CREATE TYPE "public"."promo_source" AS ENUM('admin', 'purchase', 'membership');--> statement-breakpoint
CREATE TYPE "public"."promo_target_kind" AS ENUM('indie_post', 'board_post');--> statement-breakpoint
CREATE TABLE "promotion_boosts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"target_kind" "promo_target_kind" NOT NULL,
	"target_id" uuid NOT NULL,
	"slot" "promo_slot" NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"source" "promo_source" NOT NULL,
	"note" text,
	"revoked_at" timestamp with time zone,
	"created_by" uuid,
	"created_source" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	"updated_source" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "promotion_boosts_slot_ends_idx" ON "promotion_boosts" USING btree ("slot","ends_at");--> statement-breakpoint
CREATE INDEX "promotion_boosts_target_idx" ON "promotion_boosts" USING btree ("target_kind","target_id");