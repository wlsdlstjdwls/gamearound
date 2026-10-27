ALTER TYPE "public"."notification_kind" ADD VALUE 'dev_news';--> statement-breakpoint
CREATE TABLE "developer_follows" (
	"developer_user_id" uuid NOT NULL,
	"follower_user_id" uuid NOT NULL,
	"created_by" uuid,
	"created_source" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	"updated_source" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "developer_follows_developer_user_id_follower_user_id_pk" PRIMARY KEY("developer_user_id","follower_user_id")
);
--> statement-breakpoint
CREATE TABLE "indie_link_clicks" (
	"post_id" uuid NOT NULL,
	"day" date NOT NULL,
	"link_kind" text NOT NULL,
	"clicks" integer DEFAULT 0 NOT NULL,
	"created_by" uuid,
	"created_source" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	"updated_source" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "indie_link_clicks_post_id_day_link_kind_pk" PRIMARY KEY("post_id","day","link_kind")
);
--> statement-breakpoint
CREATE TABLE "indie_post_comments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"post_id" uuid NOT NULL,
	"author_user_id" uuid NOT NULL,
	"body" text NOT NULL,
	"status" "post_status" DEFAULT 'published' NOT NULL,
	"created_by" uuid,
	"created_source" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	"updated_source" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "indie_view_days" (
	"post_id" uuid NOT NULL,
	"day" date NOT NULL,
	"views" integer DEFAULT 0 NOT NULL,
	"created_by" uuid,
	"created_source" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	"updated_source" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "indie_view_days_post_id_day_pk" PRIMARY KEY("post_id","day")
);
--> statement-breakpoint
ALTER TABLE "indie_posts" ADD COLUMN "comment_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "developer_follows" ADD CONSTRAINT "developer_follows_developer_user_id_users_id_fk" FOREIGN KEY ("developer_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "developer_follows" ADD CONSTRAINT "developer_follows_follower_user_id_users_id_fk" FOREIGN KEY ("follower_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "indie_link_clicks" ADD CONSTRAINT "indie_link_clicks_post_id_indie_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."indie_posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "indie_post_comments" ADD CONSTRAINT "indie_post_comments_post_id_indie_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."indie_posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "indie_post_comments" ADD CONSTRAINT "indie_post_comments_author_user_id_users_id_fk" FOREIGN KEY ("author_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "indie_view_days" ADD CONSTRAINT "indie_view_days_post_id_indie_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."indie_posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "developer_follows_follower_idx" ON "developer_follows" USING btree ("follower_user_id");--> statement-breakpoint
CREATE INDEX "indie_post_comments_post_idx" ON "indie_post_comments" USING btree ("post_id","created_at");--> statement-breakpoint
CREATE INDEX "indie_post_comments_created_idx" ON "indie_post_comments" USING btree ("created_at");