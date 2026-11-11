ALTER TABLE "game_platforms" ADD COLUMN "historic_low" boolean;--> statement-breakpoint
-- 찜 알림 문구를 "기록상 최저가" 에서 "역대 최저가" 로(2026-11-11 사용자, 기록 60일 이상일 때만 말한다 lib/games/historic-low). 관리자가 고친 문구는 그대로 둔다
UPDATE "notify_templates" SET "name" = $$찜 역대 최저가$$, "body" = $$찜한 '{게임}' 역대 최저가예요, 지금 {가격}$$ WHERE "code" = $$web.wish_record_low$$ AND "body" = $$찜한 '{게임}' 기록상 최저가예요, 지금 {가격}$$;
