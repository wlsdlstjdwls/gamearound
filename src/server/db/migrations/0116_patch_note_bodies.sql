-- 패치 노트 본문 전문 번역(2026-11-18 사용자 결정). 원문(body_en), 한글(body_ko), 번역 상태와 글자 수. sync/patch-translate 가 채운다.
ALTER TABLE "patch_notes" ADD COLUMN "body_en" text;--> statement-breakpoint
ALTER TABLE "patch_notes" ADD COLUMN "body_ko" text;--> statement-breakpoint
ALTER TABLE "patch_notes" ADD COLUMN "body_translated_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "patch_notes" ADD COLUMN "body_status" text;--> statement-breakpoint
ALTER TABLE "patch_notes" ADD COLUMN "body_chars" integer;--> statement-breakpoint
ALTER TABLE "patch_notes" ADD COLUMN "body_fail_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "patch_notes" ADD COLUMN "body_error" text;--> statement-breakpoint
CREATE INDEX "patch_notes_body_queue_idx" ON "patch_notes" USING btree ("published_at") WHERE "patch_notes"."body_status" is null;
