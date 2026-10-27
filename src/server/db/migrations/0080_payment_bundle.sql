ALTER TABLE "payments" ADD COLUMN "extra_target_id" uuid;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "extra_boost_id" uuid;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_extra_boost_id_promotion_boosts_id_fk" FOREIGN KEY ("extra_boost_id") REFERENCES "public"."promotion_boosts"("id") ON DELETE set null ON UPDATE no action;