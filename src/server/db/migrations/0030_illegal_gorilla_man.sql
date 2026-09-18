CREATE TABLE "user_devices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"label" text NOT NULL,
	"os_family" "os_family" NOT NULL,
	"cpu_model_key" text,
	"gpu_model_key" text,
	"ram_mb" integer,
	"storage_free_mb" integer,
	"source" text DEFAULT 'manual' NOT NULL,
	"is_primary" boolean DEFAULT false NOT NULL,
	"created_by" uuid,
	"created_source" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	"updated_source" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user_devices" ADD CONSTRAINT "user_devices_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ud_user_idx" ON "user_devices" USING btree ("user_id");