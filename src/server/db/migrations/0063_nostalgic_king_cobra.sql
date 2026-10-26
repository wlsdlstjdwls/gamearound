CREATE TYPE "public"."indie_review" AS ENUM('pending', 'approved', 'rejected');--> statement-breakpoint
ALTER TABLE "indie_posts" ADD COLUMN "review" "indie_review" DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE "indie_posts" ADD COLUMN "review_reason" text;--> statement-breakpoint
ALTER TABLE "indie_posts" ADD COLUMN "reviewed_at" timestamp with time zone;--> statement-breakpoint
-- 승인 칸이 생기기 전의 글은 이미 공개돼 있던 글이라 승인된 것으로 옮긴다(schema-indie 의 indieReviewEnum 주석)
UPDATE "indie_posts" SET "review" = 'approved', "reviewed_at" = "created_at";