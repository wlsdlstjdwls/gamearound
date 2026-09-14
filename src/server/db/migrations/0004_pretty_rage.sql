ALTER TABLE "game_platforms" ADD COLUMN "discount_starts_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "game_platforms" ADD COLUMN "discount_ends_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "game_platforms" ADD COLUMN "discount_name" text;--> statement-breakpoint
ALTER TABLE "price_snapshots" ADD COLUMN "discount_ends_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "price_snapshots" ADD COLUMN "discount_name" text;