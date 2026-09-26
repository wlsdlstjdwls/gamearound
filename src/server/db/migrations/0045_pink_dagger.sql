CREATE TABLE "shop_listing_photos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"listing_id" uuid NOT NULL,
	"url" text NOT NULL,
	"pathname" text NOT NULL,
	"width" integer NOT NULL,
	"height" integer NOT NULL,
	"byte_size" integer NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_by" uuid,
	"created_source" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	"updated_source" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "shop_listing_photos" ADD CONSTRAINT "shop_listing_photos_listing_id_shop_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."shop_listings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "shop_listing_photos_listing_idx" ON "shop_listing_photos" USING btree ("listing_id","sort_order");--> statement-breakpoint
CREATE UNIQUE INDEX "shop_listing_photos_pathname_uq" ON "shop_listing_photos" USING btree ("pathname");