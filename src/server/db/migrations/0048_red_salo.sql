CREATE TABLE "company_lookup_misses" (
	"name_norm" text PRIMARY KEY NOT NULL,
	"name_raw" text NOT NULL,
	"outcome" text NOT NULL,
	"miss_count" integer DEFAULT 1 NOT NULL,
	"retry_at" timestamp with time zone NOT NULL,
	"created_by" uuid,
	"created_source" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	"updated_source" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
