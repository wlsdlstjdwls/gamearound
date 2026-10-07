CREATE TYPE "public"."preorder_edition" AS ENUM('package', 'download');--> statement-breakpoint
CREATE TYPE "public"."preorder_post_status" AS ENUM('published', 'review', 'hidden');--> statement-breakpoint
CREATE TABLE "preorder_bonus_posts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source" text NOT NULL,
	"source_slug" text NOT NULL,
	"url" text NOT NULL,
	"title" text NOT NULL,
	"published_at" timestamp with time zone,
	"nsuids" text[] DEFAULT '{}' NOT NULL,
	"game_id" uuid,
	"status" "preorder_post_status" DEFAULT 'review' NOT NULL,
	"status_reason" text,
	"parse_version" integer NOT NULL,
	"created_by" uuid,
	"created_source" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	"updated_source" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "preorder_bonuses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"post_id" uuid NOT NULL,
	"edition" "preorder_edition" DEFAULT 'package' NOT NULL,
	"name" text NOT NULL,
	"retailers" text,
	"notes" text[] DEFAULT '{}' NOT NULL,
	"image_url" text,
	"ends_on" date,
	"sort_order" integer NOT NULL,
	"created_by" uuid,
	"created_source" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	"updated_source" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "preorder_bonus_posts" ADD CONSTRAINT "preorder_bonus_posts_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "preorder_bonuses" ADD CONSTRAINT "preorder_bonuses_post_id_preorder_bonus_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."preorder_bonus_posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "preorder_posts_source_slug_uq" ON "preorder_bonus_posts" USING btree ("source","source_slug");--> statement-breakpoint
CREATE INDEX "preorder_posts_game_status_idx" ON "preorder_bonus_posts" USING btree ("game_id","status");--> statement-breakpoint
CREATE INDEX "preorder_bonuses_post_idx" ON "preorder_bonuses" USING btree ("post_id","sort_order");