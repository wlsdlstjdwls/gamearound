CREATE TABLE "indie_view_sources" (
	"post_id" uuid NOT NULL,
	"day" date NOT NULL,
	"source" text NOT NULL,
	"views" integer DEFAULT 0 NOT NULL,
	"created_by" uuid,
	"created_source" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	"updated_source" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "indie_view_sources_post_id_day_source_pk" PRIMARY KEY("post_id","day","source")
);
--> statement-breakpoint
ALTER TABLE "indie_view_sources" ADD CONSTRAINT "indie_view_sources_post_id_indie_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."indie_posts"("id") ON DELETE cascade ON UPDATE no action;