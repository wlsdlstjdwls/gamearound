CREATE TYPE "public"."currency" AS ENUM('KRW', 'USD');--> statement-breakpoint
ALTER TABLE "game_platforms" ADD COLUMN "currency" "currency" DEFAULT 'KRW' NOT NULL;