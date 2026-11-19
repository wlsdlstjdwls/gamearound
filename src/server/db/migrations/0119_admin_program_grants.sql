-- 관리자 계정별 프로그램 권한(2026-11-19, 사용자별프로그램권한관리 화면). 줄이 없으면 전부 막힘이다(schema-admin 의 adminProgramGrants 주석).
-- 이 표를 만드는 순간 기존 관리자가 막히지 않게, 지금 있는 관리자 계정에는 그때의 모든 메뉴 프로그램을 다 켠 줄을 넣는다.
-- 주소 목록은 components/admin/admin-nav-items 의 GROUPS 와 같다(대시보드는 늘 열려 있어 넣지 않는다).
CREATE TABLE IF NOT EXISTS "admin_program_grants" (
	"user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE cascade,
	"href" text NOT NULL,
	"can_read" boolean DEFAULT false NOT NULL,
	"can_insert" boolean DEFAULT false NOT NULL,
	"can_save" boolean DEFAULT false NOT NULL,
	"can_delete" boolean DEFAULT false NOT NULL,
	"can_excel" boolean DEFAULT false NOT NULL,
	"created_by" uuid,
	"created_source" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	"updated_source" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "admin_program_grants_user_id_href_pk" PRIMARY KEY("user_id","href")
);
--> statement-breakpoint
INSERT INTO "admin_program_grants" ("user_id", "href", "can_read", "can_insert", "can_save", "can_delete", "can_excel", "created_source", "updated_source")
SELECT u."id", h."href", true, true, true, true, true, 'system', 'system'
FROM "users" u
CROSS JOIN (VALUES
	('/admin/pricing'), ('/admin/discounts'), ('/admin/promotions'), ('/admin/payments'), ('/admin/memberships'),
	('/admin/tasks'), ('/admin/matches'), ('/admin/indie'), ('/admin/company-claims'), ('/shops/admin'),
	('/admin/data-issues'), ('/admin/companies'), ('/admin/products'), ('/admin/posts'), ('/admin/preorder'), ('/admin/effects'),
	('/admin/sync'), ('/admin/sync-logs'), ('/admin/stats/sales'), ('/admin/stats/usage'),
	('/admin/codes'), ('/admin/programs'), ('/admin/grants'), ('/admin/notify-templates'), ('/admin/notify-sends'), ('/admin/guide')
) AS h("href")
WHERE u."role" = 'admin'
ON CONFLICT DO NOTHING;
