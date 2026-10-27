CREATE TYPE "public"."payment_status" AS ENUM('pending', 'paid', 'failed', 'canceled');--> statement-breakpoint
CREATE TABLE "payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" text NOT NULL,
	"user_id" uuid NOT NULL,
	"product" text NOT NULL,
	"amount" integer NOT NULL,
	"status" "payment_status" DEFAULT 'pending' NOT NULL,
	"target_kind" "promo_target_kind" NOT NULL,
	"target_id" uuid NOT NULL,
	"boost_id" uuid,
	"payment_key" text,
	"method" text,
	"receipt_url" text,
	"approved_at" timestamp with time zone,
	"fail_code" text,
	"fail_message" text,
	"created_by" uuid,
	"created_source" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	"updated_source" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payments_order_id_unique" UNIQUE("order_id")
);
--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_boost_id_promotion_boosts_id_fk" FOREIGN KEY ("boost_id") REFERENCES "public"."promotion_boosts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "payments_user_created_idx" ON "payments" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "payments_status_idx" ON "payments" USING btree ("status","created_at");