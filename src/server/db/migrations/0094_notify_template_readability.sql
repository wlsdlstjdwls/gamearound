-- 텔레그램 알림 템플릿 가독성 손질(2026-11-02 사용자 "텔레그램 템플릿 가독성 좀 높이자").
-- 무엇을 바꿨나:
--   1) 머리(사건)와 제목을 붙여 둔다 — 휴대폰 알림 미리 보기는 앞 두 줄만 보여서, 무슨 일이 어느 카드에 났는지가 거기 다 들어야 한다.
--   2) 굵은 이름표 + 띄어쓰기 둘은 비례 글꼴에서 줄이 안 맞아 이름과 값이 한 덩어리로 읽혔다. 이름표 앞에 그림 글자를 달아 줄머리를 맞추고,
--      굵게는 눈여겨볼 값(우선순위, 새 담당자, 새 상태, 건수)에만 쓴다.
--   3) 상태 변경은 "할 일에서 처리 중으로" 문장 대신 앞 상태를 취소선, 새 상태를 굵게 둔다(화살표 글자 금지, AGENTS §4). 변수 {이전상태} {새상태} 를 새로 받는다.
--   4) 점검 결과는 건수를 굵게 + "건", 사례 칸에 이름을 단다. 사례가 없을 때 "-" 대신 문구를 코드가 넘긴다.
-- 운영자가 알림템플릿관리에서 이미 고친 본문은 덮지 않는다 — 처음 시드(0090, 0091)와 글자가 같을 때만 바꾼다.
UPDATE "notify_templates" SET "body" = $$🆕 <b>새 업무요청</b>
<b>{제목}</b>

📂 분류  {분류}
⚡ 우선순위  <b>{우선순위}</b>
🙋 담당자  {담당자}
✍️ 작성자  {처리자}

🔗 <a href="{링크}">카드 열기</a>$$, "updated_at" = now(), "updated_source" = 'system'
WHERE "code" = 'task.created' AND "body" = $$🆕 새 할 일

<b>{제목}</b>

<b>분류</b>  {분류}
<b>우선순위</b>  {우선순위}
<b>담당자</b>  {담당자}
<b>작성자</b>  {처리자}

<a href="{링크}">카드 열기</a>$$;--> statement-breakpoint
UPDATE "notify_templates" SET "body" = $$👤 <b>담당자 지정</b>
<b>{제목}</b>

🙋 담당자  <b>{담당자}</b>
✍️ 지정한 사람  {처리자}

🔗 <a href="{링크}">카드 열기</a>$$, "updated_at" = now(), "updated_source" = 'system'
WHERE "code" = 'task.assigned' AND "body" = $$👤 담당자 지정

<b>{제목}</b>

<b>담당자</b>  {담당자}
<b>바꾼 사람</b>  {처리자}

<a href="{링크}">카드 열기</a>$$;--> statement-breakpoint
UPDATE "notify_templates" SET "body" = $$🔄 <b>상태 변경</b>
<b>{제목}</b>

📌 <s>{이전상태}</s>  <b>{새상태}</b>
✍️ 바꾼 사람  {처리자}

🔗 <a href="{링크}">카드 열기</a>$$, "updated_at" = now(), "updated_source" = 'system'
WHERE "code" = 'task.moved' AND "body" = $$🔄 상태 변경

<b>{제목}</b>

<b>상태</b>  {상태}
<b>바꾼 사람</b>  {처리자}

<a href="{링크}">카드 열기</a>$$;--> statement-breakpoint
UPDATE "notify_templates" SET "body" = $$💬 <b>새 기록</b>
<b>{제목}</b>

<blockquote>{기록}</blockquote>
✍️ {처리자}

🔗 <a href="{링크}">카드 열기</a>$$, "updated_at" = now(), "updated_source" = 'system'
WHERE "code" = 'task.note' AND "body" = $$💬 새 기록

<b>{제목}</b>

<blockquote>{기록}</blockquote>
<b>적은 사람</b>  {처리자}

<a href="{링크}">카드 열기</a>$$;--> statement-breakpoint
UPDATE "notify_templates" SET "body" = $$🩺 <b>데이터 점검 결과</b>

🛠️ 자동 수정  <b>{자동수정}</b>건
🆕 새로 확인 필요  <b>{신규}</b>건
📋 확인 대기 전체  <b>{미확인}</b>건
⚠️ 수정 실패  <b>{실패}</b>건

<b>자동으로 고친 것</b>
<blockquote>{사례}</blockquote>

🔗 <a href="{링크}">데이터오류관리 열기</a>$$, "updated_at" = now(), "updated_source" = 'system'
WHERE "code" = 'quality.run' AND "body" = $$<b>데이터 점검 결과</b>

자동 수정  {자동수정}
신규 확인 필요  {신규}
미확인  {미확인}
수정 실패  {실패}

<blockquote>{사례}</blockquote>

<a href="{링크}">데이터오류관리 열기</a>$$;
