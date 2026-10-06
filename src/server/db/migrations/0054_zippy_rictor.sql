CREATE TYPE "public"."indie_post_status" AS ENUM('published', 'hidden');--> statement-breakpoint
CREATE TYPE "public"."indie_stage" AS ENUM('in_development', 'demo', 'early_access', 'released');--> statement-breakpoint
CREATE TABLE "indie_post_images" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"post_id" uuid NOT NULL,
	"url" text NOT NULL,
	"pathname" text NOT NULL,
	"width" integer NOT NULL,
	"height" integer NOT NULL,
	"sort" integer DEFAULT 0 NOT NULL,
	"created_by" uuid,
	"created_source" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	"updated_source" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "indie_post_reports" (
	"post_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"reason" text NOT NULL,
	"created_by" uuid,
	"created_source" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	"updated_source" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "indie_post_reports_post_id_user_id_pk" PRIMARY KEY("post_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "indie_posts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"author_user_id" uuid NOT NULL,
	"game_id" uuid,
	"game_link_verified_at" timestamp with time zone,
	"title" text NOT NULL,
	"tagline" text NOT NULL,
	"body" text NOT NULL,
	"stage" "indie_stage" DEFAULT 'in_development' NOT NULL,
	"platforms" text[] DEFAULT '{}' NOT NULL,
	"release_note" text,
	"developer_name" text NOT NULL,
	"links" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"youtube_id" text,
	"status" "indie_post_status" DEFAULT 'published' NOT NULL,
	"status_reason" text,
	"report_count" integer DEFAULT 0 NOT NULL,
	"created_by" uuid,
	"created_source" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	"updated_source" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "indie_posts_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "indie_post_images" ADD CONSTRAINT "indie_post_images_post_id_indie_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."indie_posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "indie_post_reports" ADD CONSTRAINT "indie_post_reports_post_id_indie_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."indie_posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "indie_post_reports" ADD CONSTRAINT "indie_post_reports_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "indie_posts" ADD CONSTRAINT "indie_posts_author_user_id_users_id_fk" FOREIGN KEY ("author_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "indie_posts" ADD CONSTRAINT "indie_posts_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "indie_post_images_post_idx" ON "indie_post_images" USING btree ("post_id","sort");--> statement-breakpoint
CREATE UNIQUE INDEX "indie_post_images_pathname_uq" ON "indie_post_images" USING btree ("pathname");--> statement-breakpoint
CREATE INDEX "indie_posts_status_created_idx" ON "indie_posts" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "indie_posts_author_idx" ON "indie_posts" USING btree ("author_user_id");--> statement-breakpoint
CREATE INDEX "indie_posts_game_idx" ON "indie_posts" USING btree ("game_id");