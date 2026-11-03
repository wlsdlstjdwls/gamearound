-- 밤사이 알림 아침 모아 보내기 템플릿(2026-11-03, sync/morning-alerts). 한국 22~08시에 미룬 가격, 찜 할인 알림을 사람마다 한 통으로 보낸다.
-- 웹푸시 한 통과 메일 한 통이다. {첫알림} 은 가장 먼저 쌓인 알림 한 줄, {건수} 는 모은 알림 수, {목록} 은 메일에 줄마다 적은 알림 글이다.
INSERT INTO "notify_templates" ("code", "name", "category", "medium", "channel", "subject", "body", "system", "created_source", "updated_source") VALUES
  ('push.morning_alerts', '밤사이 알림 푸시(아침 8시)', 'member', 'push', NULL, $$밤사이 알림 {건수}건$$, $${첫알림}$$, true, 'system', 'system'),
  ('mail.morning_alerts', '밤사이 가격 알림 메일(아침 8시)', 'member', 'email', NULL, '[손전등] 밤사이 가격 알림 {건수}건', $$<b>밤사이 가격 알림 {건수}건</b>

밤에는 메일을 보내지 않고 아침에 모아서 보내 드려요.

{목록}

<a href="{링크}">알림함에서 보기</a>$$, true, 'system', 'system')
ON CONFLICT DO NOTHING;
