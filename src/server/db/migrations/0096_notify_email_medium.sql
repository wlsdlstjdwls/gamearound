CREATE TYPE "public"."notify_medium" AS ENUM('telegram', 'email');--> statement-breakpoint
ALTER TABLE "notify_sends" ALTER COLUMN "channel" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "notify_templates" ALTER COLUMN "channel" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "notify_sends" ADD COLUMN "medium" "notify_medium" DEFAULT 'telegram' NOT NULL;--> statement-breakpoint
ALTER TABLE "notify_sends" ADD COLUMN "recipient" text;--> statement-breakpoint
ALTER TABLE "notify_sends" ADD COLUMN "subject" text;--> statement-breakpoint
ALTER TABLE "notify_templates" ADD COLUMN "medium" "notify_medium" DEFAULT 'telegram' NOT NULL;--> statement-breakpoint
ALTER TABLE "notify_templates" ADD COLUMN "subject" text;--> statement-breakpoint
-- 회원 메일 템플릿(2026-11-02). 앞에는 코드가 문구를 들고 있었다(server/mail/password-reset-mail, sync/dispatch-alerts) — 그 문구를 그대로 옮긴다.
-- 받는 곳(channel)은 이메일이라 비운다. 분류 "회원"(member)을 더한다
INSERT INTO "common_codes" ("group_code", "code", "name", "sort_order", "created_source", "updated_source") VALUES
  ('NOTIFY_CATEGORY', 'member', '회원', 50, 'system', 'system')
ON CONFLICT DO NOTHING;--> statement-breakpoint
INSERT INTO "notify_templates" ("code", "name", "category", "medium", "channel", "subject", "body", "system", "created_source", "updated_source") VALUES
  ('mail.password_reset', '비밀번호 재설정 메일', 'member', 'email', NULL, '[손전등] 비밀번호 재설정 링크예요', $$<b>비밀번호 재설정</b>

손전등 비밀번호 재설정을 요청하셨어요.
아래 링크에서 새 비밀번호를 정해 주세요. 링크는 {유효시간}분 동안, 한 번만 쓸 수 있어요.

<a href="{링크}">새 비밀번호 정하기</a>
{링크}

요청한 적이 없다면 이 메일은 무시해 주세요. 비밀번호는 바뀌지 않아요.$$, true, 'system', 'system'),
  ('mail.price_alert', '가격 알림 메일', 'member', 'email', NULL, '[손전등] {제목}', $$<b>{제목}</b>

{내용}

<a href="{링크}">게임 보러 가기</a>$$, true, 'system', 'system')
ON CONFLICT DO NOTHING;
