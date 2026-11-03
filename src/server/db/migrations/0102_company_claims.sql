CREATE TYPE "public"."company_claim_status" AS ENUM('pending', 'approved', 'rejected', 'withdrawn');--> statement-breakpoint
CREATE TABLE "company_claims" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"status" "company_claim_status" DEFAULT 'pending' NOT NULL,
	"contact_name" text NOT NULL,
	"contact_title" text,
	"contact_email" text NOT NULL,
	"evidence_url" text,
	"note" text,
	"status_reason" text,
	"reviewed_at" timestamp with time zone,
	"reviewed_by" uuid,
	"created_by" uuid,
	"created_source" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	"updated_source" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "company_claims" ADD CONSTRAINT "company_claims_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_claims" ADD CONSTRAINT "company_claims_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_claims" ADD CONSTRAINT "company_claims_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "company_claims_status_idx" ON "company_claims" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "company_claims_user_idx" ON "company_claims" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "company_claims_pending_uq" ON "company_claims" USING btree ("company_id","user_id") WHERE status = 'pending';