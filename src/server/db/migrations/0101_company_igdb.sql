ALTER TABLE "companies" ADD COLUMN "igdb_id" integer;--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "igdb_checked_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "logo_url" text;--> statement-breakpoint
ALTER TABLE "companies" ADD CONSTRAINT "companies_igdb_id_unique" UNIQUE("igdb_id");