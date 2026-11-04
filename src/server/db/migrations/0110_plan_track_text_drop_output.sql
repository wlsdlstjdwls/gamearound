-- 결과물(output) 칸을 걷기 전에 값이 있으면 메모 맨 앞으로 옮긴다(2026-11-04, 사용자 "결과물 빼줘")
UPDATE "admin_plan_items" SET "memo" = '결과물: ' || "output" || CASE WHEN "memo" IS NULL OR "memo" = '' THEN '' ELSE E'
' || "memo" END, "updated_at" = now(), "updated_source" = 'system' WHERE "output" IS NOT NULL AND "output" <> '';--> statement-breakpoint
ALTER TABLE "admin_plan_items" ALTER COLUMN "track" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "admin_plan_items" ALTER COLUMN "track" SET DATA TYPE text USING "track"::text;--> statement-breakpoint
ALTER TABLE "admin_plan_items" ALTER COLUMN "track" SET DEFAULT 'dev';--> statement-breakpoint
ALTER TABLE "admin_plan_items" DROP COLUMN "output";--> statement-breakpoint
DROP TYPE "public"."admin_plan_track";--> statement-breakpoint
-- 파트는 이제 공통코드 PLAN_TRACK 이다(공통코드관리에서 더한다). 시작값 셋을 깐다
INSERT INTO "common_code_groups" ("group_code", "name", "description", "sort_order", "active", "created_source", "updated_source") VALUES ('PLAN_TRACK', '일정 파트', '업무관리 일정(WBS)의 파트. 코드를 더하면 일정 화면의 파트 고르기와 색에 바로 나온다', 100, true, 'system', 'system') ON CONFLICT DO NOTHING;--> statement-breakpoint
INSERT INTO "common_codes" ("group_code", "code", "name", "sort_order", "active", "created_source", "updated_source") VALUES ('PLAN_TRACK', 'dev', '개발', 10, true, 'system', 'system'), ('PLAN_TRACK', 'plan', '기획', 20, true, 'system', 'system'), ('PLAN_TRACK', 'sales', '영업', 30, true, 'system', 'system') ON CONFLICT DO NOTHING;