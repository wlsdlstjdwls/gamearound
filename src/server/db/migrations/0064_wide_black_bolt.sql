CREATE TABLE "hall_of_fame_months" (
	"ym" text NOT NULL,
	"rank" integer NOT NULL,
	"post_id" uuid NOT NULL,
	"score" integer NOT NULL,
	"created_by" uuid,
	"created_source" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	"updated_source" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "hall_of_fame_months_ym_rank_pk" PRIMARY KEY("ym","rank")
);
--> statement-breakpoint
CREATE TABLE "indie_post_likes" (
	"post_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"created_by" uuid,
	"created_source" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	"updated_source" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "indie_post_likes_post_id_user_id_pk" PRIMARY KEY("post_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "indie_view_months" (
	"post_id" uuid NOT NULL,
	"ym" text NOT NULL,
	"views" integer DEFAULT 0 NOT NULL,
	"created_by" uuid,
	"created_source" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	"updated_source" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "indie_view_months_post_id_ym_pk" PRIMARY KEY("post_id","ym")
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "avatar_url" text;--> statement-breakpoint
ALTER TABLE "indie_posts" ADD COLUMN "view_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "indie_posts" ADD COLUMN "like_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "hall_of_fame_months" ADD CONSTRAINT "hall_of_fame_months_post_id_indie_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."indie_posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "indie_post_likes" ADD CONSTRAINT "indie_post_likes_post_id_indie_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."indie_posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "indie_post_likes" ADD CONSTRAINT "indie_post_likes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "indie_view_months" ADD CONSTRAINT "indie_view_months_post_id_indie_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."indie_posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "indie_post_likes_created_idx" ON "indie_post_likes" USING btree ("created_at");