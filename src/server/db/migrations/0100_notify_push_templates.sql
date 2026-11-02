-- 웹푸시 템플릿(2026-11-02, 사용자 "웹푸시 제목이랑 본문도 템플릿으로"). 앞에는 lib/alerts/payload 의 alertPayload 가 글을 지었다 — 그 글 그대로 옮긴다.
-- 할인이 붙었는지에 따라 제목과 본문 꼴이 달라 템플릿을 둘로 나눴다(템플릿에는 조건문이 없다). 가격 알림과 찜 할인 알림이 같이 쓴다.
-- 0099 에서 notify_medium 에 'push' 를 더했다. 새 enum 값은 같은 트랜잭션에서 못 써 시드를 갈랐다
INSERT INTO "notify_templates" ("code", "name", "category", "medium", "channel", "subject", "body", "system", "created_source", "updated_source") VALUES
  ('push.price_sale', '가격, 찜 푸시(할인 중)', 'member', 'push', NULL, $${게임} 할인 중$$, $${기종} {가격} ({할인율}% 할인)$$, true, 'system', 'system'),
  ('push.price_drop', '가격, 찜 푸시(값 내림)', 'member', 'push', NULL, $${게임} 가격이 내려갔어요$$, $${기종} {가격}$$, true, 'system', 'system')
ON CONFLICT DO NOTHING;
