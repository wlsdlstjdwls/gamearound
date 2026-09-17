CREATE TYPE "public"."shop_address_type" AS ENUM('offline', 'online_only', 'none');--> statement-breakpoint
CREATE TYPE "public"."shop_staff_role" AS ENUM('owner', 'manager', 'staff');--> statement-breakpoint
CREATE TYPE "public"."shop_status" AS ENUM('pending', 'active', 'suspended');--> statement-breakpoint
CREATE TYPE "public"."shop_type" AS ENUM('business', 'personal');--> statement-breakpoint
CREATE TABLE "shop_staff" (
	"shop_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" "shop_staff_role" DEFAULT 'staff' NOT NULL,
	"invited_by" uuid,
	"joined_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"created_source" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	"updated_source" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "shop_staff_shop_id_user_id_pk" PRIMARY KEY("shop_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "shop_staff_invites" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"shop_id" uuid NOT NULL,
	"email" text NOT NULL,
	"role" "shop_staff_role" DEFAULT 'staff' NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"accepted_at" timestamp with time zone,
	"accepted_user_id" uuid,
	"created_by" uuid,
	"created_source" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	"updated_source" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "shop_staff_invites_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "shops" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"shop_type" "shop_type" DEFAULT 'business' NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"owner_user_id" uuid NOT NULL,
	"biz_reg_no" text,
	"address_type" "shop_address_type" DEFAULT 'offline' NOT NULL,
	"address" text,
	"address_detail" text,
	"postal_code" text,
	"lat" numeric(9, 6),
	"lng" numeric(9, 6),
	"phone" text,
	"hours" text,
	"description" text,
	"status" "shop_status" DEFAULT 'pending' NOT NULL,
	"status_reason" text,
	"approved_at" timestamp with time zone,
	"approved_by" uuid,
	"rating_avg" numeric(3, 2),
	"rating_count" integer DEFAULT 0 NOT NULL,
	"created_by" uuid,
	"created_source" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	"updated_source" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "shops_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "shop_staff" ADD CONSTRAINT "shop_staff_shop_id_shops_id_fk" FOREIGN KEY ("shop_id") REFERENCES "public"."shops"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shop_staff" ADD CONSTRAINT "shop_staff_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shop_staff" ADD CONSTRAINT "shop_staff_invited_by_users_id_fk" FOREIGN KEY ("invited_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shop_staff_invites" ADD CONSTRAINT "shop_staff_invites_shop_id_shops_id_fk" FOREIGN KEY ("shop_id") REFERENCES "public"."shops"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shop_staff_invites" ADD CONSTRAINT "shop_staff_invites_accepted_user_id_users_id_fk" FOREIGN KEY ("accepted_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shops" ADD CONSTRAINT "shops_owner_user_id_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shops" ADD CONSTRAINT "shops_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "shop_staff_user_idx" ON "shop_staff" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "shop_staff_invites_shop_idx" ON "shop_staff_invites" USING btree ("shop_id");--> statement-breakpoint
CREATE UNIQUE INDEX "shop_staff_invites_open_uq" ON "shop_staff_invites" USING btree ("shop_id","email") WHERE accepted_at is null;--> statement-breakpoint
CREATE INDEX "shops_status_idx" ON "shops" USING btree ("status");--> statement-breakpoint
CREATE INDEX "shops_owner_idx" ON "shops" USING btree ("owner_user_id");