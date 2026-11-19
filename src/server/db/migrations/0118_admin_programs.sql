-- 관리자 프로그램 노출, 사용 여부(2026-11-19, 프로그램관리 화면). 메뉴 목록은 코드에 있고 이 표는 덮어쓰기만 한다(schema-admin 의 adminPrograms 주석).
-- 줄이 없으면 둘 다 켜짐이라 적용 전에도 화면은 깨지지 않는다(services/admin-programs 가 읽기 실패를 기본값으로 받는다).
CREATE TABLE IF NOT EXISTS "admin_programs" (
	"href" text PRIMARY KEY NOT NULL,
	"visible" boolean DEFAULT true NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_by" uuid,
	"created_source" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	"updated_source" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
