-- 사용자별프로그램관리(/admin/user-programs) 화면을 새로 붙였다(2026-11-19). 권한 줄이 없으면 막힘이라(0119) 아무도 못 연다.
-- 프로그램별사용자권한관리(/admin/grants) 권한을 가진 계정에게 같은 값을 그대로 옮겨 준다 — 권한을 고치던 사람이 이 화면도 쓴다.
INSERT INTO "admin_program_grants" ("user_id", "href", "can_read", "can_insert", "can_save", "can_delete", "can_excel", "created_source", "updated_source")
SELECT g."user_id", '/admin/user-programs', g."can_read", g."can_insert", g."can_save", g."can_delete", g."can_excel", 'system', 'system'
FROM "admin_program_grants" g
WHERE g."href" = '/admin/grants'
ON CONFLICT DO NOTHING;
