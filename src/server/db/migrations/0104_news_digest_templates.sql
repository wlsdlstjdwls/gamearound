-- 주간 맞춤 소식 템플릿(2026-11-03, sync/news-digest). 메일 한 통과 알림함 한 줄이다.
-- 0103 에서 notification_kind 에 'news' 를 더했다. 새 enum 값은 같은 트랜잭션에서 못 써서 시드를 이 파일로 갈랐다(0097, 0098 과 같은 사정 — 이 시드는 그 값을 쓰지 않지만 순서를 맞춘다).
-- 메일의 {목록} 은 기사 제목을 줄마다 적은 글이다. 변수 값은 늘 글자로 들어가서(lib/notify/template) 줄마다 링크를 걸 수 없다 —
-- 그래서 "전체 보기" 하나로 사이트의 맞춤 소식 화면(/news/mine)에 보낸다. 거기서 같은 목록을 누르면 원문으로 간다.
-- 받지 않는 길(설정 링크)을 메일 끝에 늘 둔다. 회원이 켠 메일이지만 끄는 자리를 찾느라 헤매면 스팸 신고가 된다.
INSERT INTO "notify_templates" ("code", "name", "category", "medium", "channel", "subject", "body", "system", "created_source", "updated_source") VALUES
  ('mail.news_digest', '주간 맞춤 소식 메일', 'member', 'email', NULL, '[손전등] 이번 주 맞춤 소식 {건수}건', $$<b>이번 주 맞춤 소식 {건수}건</b>

찜한 게임과 고른 플랫폼, 장르에 맞춰 골랐어요.

{목록}

<a href="{링크}">사이트에서 전체 보기</a>

받고 싶지 않으면 <a href="{설정링크}">설정</a>에서 끌 수 있어요.$$, true, 'system', 'system'),
  ('web.news_digest', '주간 맞춤 소식', 'member', 'web', NULL, NULL, $$이번 주 맞춤 소식 {건수}건이 모였어요$$, true, 'system', 'system')
ON CONFLICT DO NOTHING;
