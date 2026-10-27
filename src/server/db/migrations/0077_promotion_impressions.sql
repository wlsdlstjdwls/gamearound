CREATE TABLE "promotion_impressions" (
	"boost_id" uuid NOT NULL,
	"day" date NOT NULL,
	"views" integer DEFAULT 0 NOT NULL,
	"clicks" integer DEFAULT 0 NOT NULL,
	"created_by" uuid,
	"created_source" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	"updated_source" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "promotion_impressions_boost_id_day_pk" PRIMARY KEY("boost_id","day")
);
--> statement-breakpoint
ALTER TABLE "promotion_impressions" ADD CONSTRAINT "promotion_impressions_boost_id_promotion_boosts_id_fk" FOREIGN KEY ("boost_id") REFERENCES "public"."promotion_boosts"("id") ON DELETE cascade ON UPDATE no action;