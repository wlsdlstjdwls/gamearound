CREATE TYPE "public"."notify_send_status" AS ENUM('sent', 'failed', 'skipped');--> statement-breakpoint
CREATE TYPE "public"."notify_trigger" AS ENUM('manual', 'system');--> statement-breakpoint
CREATE TABLE "common_code_groups" (
	"group_code" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"attr1_label" text,
	"attr2_label" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_by" uuid,
	"created_source" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	"updated_source" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "common_codes" (
	"group_code" text NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"attr1" text,
	"attr2" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"memo" text,
	"created_by" uuid,
	"created_source" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	"updated_source" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "common_codes_group_code_code_pk" PRIMARY KEY("group_code","code")
);
--> statement-breakpoint
CREATE TABLE "notify_sends" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"template_code" text,
	"channel" text NOT NULL,
	"chat_id" text,
	"trigger" "notify_trigger" NOT NULL,
	"text" text NOT NULL,
	"status" "notify_send_status" NOT NULL,
	"error" text,
	"sent_at" timestamp with time zone,
	"created_by" uuid,
	"created_source" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	"updated_source" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notify_templates" (
	"code" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"category" text NOT NULL,
	"channel" text NOT NULL,
	"body" text NOT NULL,
	"system" boolean DEFAULT false NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"memo" text,
	"created_by" uuid,
	"created_source" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	"updated_source" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "common_codes" ADD CONSTRAINT "common_codes_group_code_common_code_groups_group_code_fk" FOREIGN KEY ("group_code") REFERENCES "public"."common_code_groups"("group_code") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "notify_sends_created_idx" ON "notify_sends" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "notify_sends_template_idx" ON "notify_sends" USING btree ("template_code","created_at");--> statement-breakpoint
-- 시드: 코드가 읽는 공통코드 그룹 둘과 업무요청 알림 템플릿 넷. 업무요청 템플릿 본문은 그때까지 코드가 만들던 글(lib/admin/task-notify)과 같은 모양이다
INSERT INTO "common_code_groups" ("group_code", "name", "description", "attr1_label", "sort_order", "created_source", "updated_source") VALUES
  ('NOTIFY_CHANNEL', '알림 받는 곳', '텔레그램 알림을 받는 채널, 대화방. chat id 가 비면 환경 변수 TELEGRAM_ADMIN_CHAT_ID 로 보낸다', '텔레그램 chat id', 10, 'system', 'system'),
  ('NOTIFY_CATEGORY', '알림 분류', '알림 템플릿 분류', NULL, 20, 'system', 'system')
ON CONFLICT DO NOTHING;--> statement-breakpoint
INSERT INTO "common_codes" ("group_code", "code", "name", "sort_order", "created_source", "updated_source") VALUES
  ('NOTIFY_CHANNEL', 'admin', '관리자 채널', 10, 'system', 'system'),
  ('NOTIFY_CATEGORY', 'task', '업무요청', 10, 'system', 'system'),
  ('NOTIFY_CATEGORY', 'notice', '운영공지', 20, 'system', 'system'),
  ('NOTIFY_CATEGORY', 'sales', '매출', 30, 'system', 'system'),
  ('NOTIFY_CATEGORY', 'system', '시스템', 40, 'system', 'system')
ON CONFLICT DO NOTHING;--> statement-breakpoint
INSERT INTO "notify_templates" ("code", "name", "category", "channel", "body", "system", "created_source", "updated_source") VALUES
  ('task.created', '업무요청 등록', 'task', 'admin', $$🆕 새 할 일

<b>{제목}</b>

<b>분류</b>  {분류}
<b>우선순위</b>  {우선순위}
<b>담당자</b>  {담당자}
<b>작성자</b>  {처리자}

<a href="{링크}">카드 열기</a>$$, true, 'system', 'system'),
  ('task.assigned', '업무요청 담당자 지정', 'task', 'admin', $$👤 담당자 지정

<b>{제목}</b>

<b>담당자</b>  {담당자}
<b>바꾼 사람</b>  {처리자}

<a href="{링크}">카드 열기</a>$$, true, 'system', 'system'),
  ('task.moved', '업무요청 상태 변경', 'task', 'admin', $$🔄 상태 변경

<b>{제목}</b>

<b>상태</b>  {상태}
<b>바꾼 사람</b>  {처리자}

<a href="{링크}">카드 열기</a>$$, true, 'system', 'system'),
  ('task.note', '업무요청 기록 추가', 'task', 'admin', $$💬 새 기록

<b>{제목}</b>

<blockquote>{기록}</blockquote>
<b>적은 사람</b>  {처리자}

<a href="{링크}">카드 열기</a>$$, true, 'system', 'system'),
  ('notice.free', '운영 공지', 'notice', 'admin', $$📢 <b>{제목}</b>

{내용}$$, false, 'system', 'system')
ON CONFLICT DO NOTHING;
