CREATE TABLE "search_misses" (
	"query_key" text PRIMARY KEY NOT NULL,
	"query" text NOT NULL,
	"miss_count" integer DEFAULT 1 NOT NULL,
	"request_count" integer DEFAULT 0 NOT NULL,
	"last_missed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"created_source" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	"updated_source" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "search_misses_count_idx" ON "search_misses" USING btree ("miss_count");