CREATE TYPE "public"."data_issue_status" AS ENUM('open', 'applied', 'dismissed');--> statement-breakpoint
CREATE TABLE "data_issues" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"rule" text NOT NULL,
	"subject_key" text NOT NULL,
	"verdict" text NOT NULL,
	"game_id" uuid,
	"reason" text NOT NULL,
	"fix" jsonb,
	"status" "data_issue_status" DEFAULT 'open' NOT NULL,
	"resolved_at" timestamp with time zone,
	"created_by" uuid,
	"created_source" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	"updated_source" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "data_corrections" ALTER COLUMN "admin_user_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "data_issues" ADD CONSTRAINT "data_issues_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "data_issues_rule_subject_uq" ON "data_issues" USING btree ("rule","subject_key");--> statement-breakpoint
CREATE INDEX "data_issues_status_idx" ON "data_issues" USING btree ("status","created_at");