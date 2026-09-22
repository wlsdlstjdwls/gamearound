CREATE TYPE "public"."deal_style" AS ENUM('full_price', 'wait_small', 'wait_deep', 'historic_low');--> statement-breakpoint
CREATE TYPE "public"."play_time_style" AS ENUM('short', 'medium', 'long', 'endless');--> statement-breakpoint
CREATE TABLE "user_profiles" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"platforms" "platform"[],
	"favorite_genre_ids" integer[],
	"deal_style" "deal_style",
	"play_time_style" "play_time_style",
	"subscription_keys" text[],
	"personalization_consent_at" timestamp with time zone,
	"onboarding_step" text,
	"onboarding_done_at" timestamp with time zone,
	"created_by" uuid,
	"created_source" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	"updated_source" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user_profiles" ADD CONSTRAINT "user_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "user_profiles_platforms_idx" ON "user_profiles" USING gin ("platforms");--> statement-breakpoint
CREATE INDEX "user_profiles_genres_idx" ON "user_profiles" USING gin ("favorite_genre_ids");