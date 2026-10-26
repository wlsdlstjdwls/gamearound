CREATE TYPE "public"."consent_kind" AS ENUM('terms', 'privacy', 'alert_email');--> statement-breakpoint
CREATE TABLE "user_consents" (
	"user_id" uuid NOT NULL,
	"kind" "consent_kind" NOT NULL,
	"agreed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"created_source" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	"updated_source" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_consents_user_id_kind_pk" PRIMARY KEY("user_id","kind")
);
--> statement-breakpoint
ALTER TABLE "indie_posts" ADD COLUMN "genres" text[] DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE "user_consents" ADD CONSTRAINT "user_consents_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;