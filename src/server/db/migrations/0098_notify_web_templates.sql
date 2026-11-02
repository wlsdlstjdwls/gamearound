-- 회원 알림함(웹 알림) 템플릿(2026-11-02, 사용자 "웹 알림도 추가"). 앞에는 코드가 문구를 들고 있었다(lib/notifications/messages 등) — 그 문구를 그대로 옮긴다.
-- 0097 에서 notify_medium 에 'web' 을 더했다. 새 enum 값은 더한 트랜잭션 안에서 못 쓰므로 시드를 이 파일로 갈랐다
INSERT INTO "notify_templates" ("code", "name", "category", "medium", "channel", "subject", "body", "system", "created_source", "updated_source") VALUES
  ('web.comment', '게시글 새 댓글', 'member', 'web', NULL, NULL, $$'{글제목}' 글에 새 댓글이 달렸어요$$, true, 'system', 'system'),
  ('web.reply', '댓글 새 답글', 'member', 'web', NULL, NULL, $$'{글제목}' 글의 내 댓글에 답글이 달렸어요$$, true, 'system', 'system'),
  ('web.indie_comment', '인디 게임 새 댓글', 'member', 'web', NULL, NULL, $$'{게임}' 에 새 댓글이 달렸어요$$, true, 'system', 'system'),
  ('web.approved', '인디 게임 등록 승인', 'member', 'web', NULL, NULL, $$'{게임}' 등록이 승인됐어요$$, true, 'system', 'system'),
  ('web.rejected', '인디 게임 등록 반려', 'member', 'web', NULL, NULL, $$'{게임}' 등록이 반려됐어요. 사유를 확인해 주세요$$, true, 'system', 'system'),
  ('web.price_drop', '가격 알림 하락', 'member', 'web', NULL, NULL, $${게임} 가격이 {가격}(으)로 내려갔어요$$, true, 'system', 'system'),
  ('web.price_met', '가격 알림 조건 충족', 'member', 'web', NULL, NULL, $${게임} 지금 {가격}, 알림 조건에 맞아요$$, true, 'system', 'system'),
  ('web.wish_sale', '찜 할인', 'member', 'web', NULL, NULL, $$찜한 '{게임}' {할인율}% 할인, 지금 {가격}이에요$$, true, 'system', 'system'),
  ('web.wish_record_low', '찜 기록상 최저가', 'member', 'web', NULL, NULL, $$찜한 '{게임}' 기록상 최저가예요, 지금 {가격}$$, true, 'system', 'system'),
  ('web.released', '찜 게임 출시', 'member', 'web', NULL, NULL, $$찜한 '{게임}' 출시 소식이 왔어요$$, true, 'system', 'system'),
  ('web.membership_renewed', '멤버십 갱신', 'member', 'web', NULL, NULL, $$메이커 멤버십이 갱신됐어요. 이용권 {이용권}장이 채워졌고 다음 결제는 {다음결제일}이에요$$, true, 'system', 'system'),
  ('web.membership_failed', '멤버십 결제 실패', 'member', 'web', NULL, NULL, $$메이커 멤버십 결제에 실패했어요({사유}). 내일 다시 결제해요. 카드를 확인해 주세요$$, true, 'system', 'system'),
  ('web.membership_ended', '멤버십 종료', 'member', 'web', NULL, NULL, $$메이커 멤버십이 끝났어요$$, true, 'system', 'system'),
  ('web.refunded', '환불 완료', 'member', 'web', NULL, NULL, $${상품} 결제 중 {금액}을 환불했어요$$, true, 'system', 'system')
ON CONFLICT DO NOTHING;
