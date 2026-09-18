CREATE TYPE "public"."fulfillment" AS ENUM('inquiry', 'pickup', 'delivery');--> statement-breakpoint
CREATE TYPE "public"."listing_condition" AS ENUM('sealed', 'new', 'used');--> statement-breakpoint
CREATE TYPE "public"."listing_source" AS ENUM('manual', 'csv', 'api', 'pos');--> statement-breakpoint
CREATE TYPE "public"."listing_status" AS ENUM('draft', 'selling', 'soldout', 'hidden');--> statement-breakpoint
CREATE TYPE "public"."package_type" AS ENUM('cart_only', 'boxed', 'big_box', 'digipak', 'code_card', 'set');--> statement-breakpoint
CREATE TYPE "public"."product_component_kind" AS ENUM('game', 'dlc', 'soundtrack', 'artbook', 'figure', 'steelbook', 'code', 'goods');--> statement-breakpoint
CREATE TYPE "public"."unit_grade" AS ENUM('S', 'A', 'B', 'C');--> statement-breakpoint
CREATE TABLE "hardware_models" (
	"code" text PRIMARY KEY NOT NULL,
	"name_ko" text NOT NULL,
	"name_en" text,
	"maker" text,
	"generation" integer,
	"release_year" integer,
	"is_retro" boolean DEFAULT false NOT NULL,
	"media_type" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_by" uuid,
	"created_source" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	"updated_source" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_components" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"kind" "product_component_kind" NOT NULL,
	"game_id" uuid,
	"label" text,
	"qty" integer DEFAULT 1 NOT NULL,
	"created_by" uuid,
	"created_source" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	"updated_source" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"barcode" text,
	"game_id" uuid,
	"hardware_code" text,
	"region_code" text,
	"edition_name" text,
	"package_type" "package_type",
	"language_ko" boolean,
	"release_year" integer,
	"publisher_label" text,
	"is_official" boolean DEFAULT true NOT NULL,
	"name" text NOT NULL,
	"registered_shop_id" uuid,
	"verified_at" timestamp with time zone,
	"verified_by" uuid,
	"created_by" uuid,
	"created_source" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	"updated_source" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shop_listing_units" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"listing_id" uuid NOT NULL,
	"unit_no" integer NOT NULL,
	"grade" "unit_grade",
	"has_box" boolean,
	"has_manual" boolean,
	"has_insert" boolean,
	"has_case" boolean,
	"defect_note" text,
	"sold_at" timestamp with time zone,
	"created_by" uuid,
	"created_source" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	"updated_source" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shop_listings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"shop_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"condition" "listing_condition" NOT NULL,
	"price_minor" integer NOT NULL,
	"discount_minor" integer,
	"currency" text DEFAULT 'KRW' NOT NULL,
	"on_hand" integer DEFAULT 0 NOT NULL,
	"held" integer DEFAULT 0 NOT NULL,
	"status" "listing_status" DEFAULT 'draft' NOT NULL,
	"source" "listing_source" DEFAULT 'manual' NOT NULL,
	"external_id" text,
	"stock_updated_at" timestamp with time zone,
	"is_unique" boolean DEFAULT false NOT NULL,
	"fulfillment" "fulfillment" DEFAULT 'inquiry' NOT NULL,
	"created_by" uuid,
	"created_source" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	"updated_source" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shop_stock_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"listing_id" uuid NOT NULL,
	"before_qty" integer NOT NULL,
	"after_qty" integer NOT NULL,
	"reason" text NOT NULL,
	"created_by" uuid,
	"created_source" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	"updated_source" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "product_components" ADD CONSTRAINT "product_components_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_components" ADD CONSTRAINT "product_components_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_hardware_code_hardware_models_code_fk" FOREIGN KEY ("hardware_code") REFERENCES "public"."hardware_models"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_registered_shop_id_shops_id_fk" FOREIGN KEY ("registered_shop_id") REFERENCES "public"."shops"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_verified_by_users_id_fk" FOREIGN KEY ("verified_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shop_listing_units" ADD CONSTRAINT "shop_listing_units_listing_id_shop_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."shop_listings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shop_listings" ADD CONSTRAINT "shop_listings_shop_id_shops_id_fk" FOREIGN KEY ("shop_id") REFERENCES "public"."shops"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shop_listings" ADD CONSTRAINT "shop_listings_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shop_stock_events" ADD CONSTRAINT "shop_stock_events_listing_id_shop_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."shop_listings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "hardware_models_retro_idx" ON "hardware_models" USING btree ("is_retro","sort_order");--> statement-breakpoint
CREATE INDEX "product_components_product_idx" ON "product_components" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "product_components_game_idx" ON "product_components" USING btree ("game_id");--> statement-breakpoint
CREATE UNIQUE INDEX "products_barcode_uq" ON "products" USING btree ("barcode") WHERE barcode is not null;--> statement-breakpoint
CREATE INDEX "products_game_idx" ON "products" USING btree ("game_id");--> statement-breakpoint
CREATE INDEX "products_shop_idx" ON "products" USING btree ("registered_shop_id");--> statement-breakpoint
CREATE UNIQUE INDEX "shop_listing_units_no_uq" ON "shop_listing_units" USING btree ("listing_id","unit_no");--> statement-breakpoint
CREATE INDEX "shop_listings_shop_idx" ON "shop_listings" USING btree ("shop_id","status");--> statement-breakpoint
CREATE INDEX "shop_listings_product_idx" ON "shop_listings" USING btree ("product_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "shop_listings_shop_product_condition_uq" ON "shop_listings" USING btree ("shop_id","product_id","condition");--> statement-breakpoint
CREATE INDEX "shop_stock_events_listing_idx" ON "shop_stock_events" USING btree ("listing_id","created_at");