CREATE TABLE "indie_playtest_applications" (
	"playtest_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"message" text NOT NULL,
	"created_by" uuid,
	"created_source" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	"updated_source" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "indie_playtest_applications_playtest_id_user_id_pk" PRIMARY KEY("playtest_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "indie_playtests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"post_id" uuid NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"slots" integer NOT NULL,
	"closes_at" timestamp with time zone NOT NULL,
	"closed_at" timestamp with time zone,
	"created_by" uuid,
	"created_source" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	"updated_source" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "indie_playtest_applications" ADD CONSTRAINT "indie_playtest_applications_playtest_id_indie_playtests_id_fk" FOREIGN KEY ("playtest_id") REFERENCES "public"."indie_playtests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "indie_playtest_applications" ADD CONSTRAINT "indie_playtest_applications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "indie_playtests" ADD CONSTRAINT "indie_playtests_post_id_indie_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."indie_posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "indie_playtest_applications_user_idx" ON "indie_playtest_applications" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "indie_playtests_post_idx" ON "indie_playtests" USING btree ("post_id","created_at");--> statement-breakpoint
CREATE INDEX "indie_playtests_closes_idx" ON "indie_playtests" USING btree ("closes_at");