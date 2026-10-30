-- 데이터 점검(sync/quality) 결과 알림도 템플릿을 거친다(2026-10-30). 앞에는 코드가 글을 만들었다 — 줄 모양은 같고, 수정 실패 줄은 늘 선다(0 이면 0)
INSERT INTO "notify_templates" ("code", "name", "category", "channel", "body", "system", "created_source", "updated_source") VALUES
  ('quality.run', '데이터 점검 결과', 'system', 'admin', $$<b>데이터 점검 결과</b>

자동 수정  {자동수정}
신규 확인 필요  {신규}
미확인  {미확인}
수정 실패  {실패}

<blockquote>{사례}</blockquote>

<a href="{링크}">데이터오류관리 열기</a>$$, true, 'system', 'system')
ON CONFLICT DO NOTHING;
