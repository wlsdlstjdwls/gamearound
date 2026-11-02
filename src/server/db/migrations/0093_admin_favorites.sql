CREATE TABLE "admin_favorites" (
	"user_id" uuid NOT NULL,
	"href" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_by" uuid,
	"created_source" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	"updated_source" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "admin_favorites_user_id_href_pk" PRIMARY KEY("user_id","href")
);
--> statement-breakpoint
ALTER TABLE "admin_favorites" ADD CONSTRAINT "admin_favorites_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;