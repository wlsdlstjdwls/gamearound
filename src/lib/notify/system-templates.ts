// 코드가 사건마다 부르는 알림 템플릿(2026-10-30). 템플릿 본문은 알림템플릿관리에서 고치고, 코드와 변수는 여기서 정한다.
// 변수 목록을 화면에 보여 주려고 이름과 설명, 미리 보기 값을 같이 둔다. 본문에 없는 변수를 넣으면 {이름} 그대로 나가므로 이 목록이 곧 계약이다.
export const SYSTEM_TEMPLATES = {
  taskCreated: "task.created",
  taskAssigned: "task.assigned",
  taskMoved: "task.moved",
  taskNote: "task.note",
  qualityRun: "quality.run",
  // 회원에게 가는 메일(2026-11-02). 발송 수단이 이메일이고 받는 사람은 사건이 정한다
  mailPasswordReset: "mail.password_reset",
  mailPriceAlert: "mail.price_alert",
  mailNewsDigest: "mail.news_digest",
  // 밤사이 미룬 알림을 아침 8시에 모아 보내는 한 통(2026-11-03, sync/morning-alerts)
  mailMorningAlerts: "mail.morning_alerts",
  pushMorningAlerts: "push.morning_alerts",
  // 회원 알림함(웹 알림, 2026-11-02). 받는 사람과 링크는 사건이 정한다
  webComment: "web.comment",
  webReply: "web.reply",
  webIndieComment: "web.indie_comment",
  webApproved: "web.approved",
  webRejected: "web.rejected",
  webPriceDrop: "web.price_drop",
  webPriceMet: "web.price_met",
  webWishSale: "web.wish_sale",
  webWishRecordLow: "web.wish_record_low",
  webReleased: "web.released",
  webNewsDigest: "web.news_digest",
  webMembershipRenewed: "web.membership_renewed",
  webMembershipFailed: "web.membership_failed",
  webMembershipEnded: "web.membership_ended",
  webRefunded: "web.refunded",
  // 웹푸시(2026-11-02). 할인 여부로 둘이 갈린다 — 가격 알림, 찜 할인 알림이 같이 쓴다(lib/alerts/payload 의 alertPushCode)
  pushPriceSale: "push.price_sale",
  pushPriceDrop: "push.price_drop",
} as const;
/**
 * 템플릿 없이 직접 쓴 웹 알림의 template_code(notifications). 이력 목록이 "템플릿을 지난 줄" 만 읽으므로 비우면 직접 보낸 줄이 이력에서 빠진다.
 * 템플릿 표에 없는 코드라 화면에는 "직접 작성" 으로 보인다
 */
export const MANUAL_WEB_CODE = "manual";

export type SystemTemplateCode = (typeof SYSTEM_TEMPLATES)[keyof typeof SYSTEM_TEMPLATES];

type VarSpec = { name: string; hint: string; sample: string };

const GAME: VarSpec = { name: "게임", hint: "게임 이름", sample: "하데스 II" };
const PRICE: VarSpec = { name: "가격", hint: "지금 값(원 붙은 글)", sample: "27,000원" };
const PLATFORM: VarSpec = { name: "기종", hint: "스토어, 기기 이름", sample: "Steam" };
const MORNING_COUNT: VarSpec = { name: "건수", hint: "모은 알림 수(숫자만)", sample: "3" };
const DIGEST_COUNT: VarSpec = { name: "건수", hint: "묶음에 든 기사 수(숫자만)", sample: "6" };
const POST_TITLE: VarSpec = { name: "글제목", hint: "게시글 제목", sample: "하데스 2 초반 공략" };

const TASK_BASE: VarSpec[] = [
  { name: "제목", hint: "업무요청 제목", sample: "스팀 가격 수집 지연 확인" },
  { name: "처리자", hint: "이 사건을 낸 관리자", sample: "운영자" },
  { name: "링크", hint: "카드 바로가기 주소", sample: "https://gamearound.kr/admin/tasks?task=sample" },
];

export const SYSTEM_TEMPLATE_VARS: Record<SystemTemplateCode, VarSpec[]> = {
  "task.created": [
    ...TASK_BASE,
    { name: "분류", hint: "업무 분류", sample: "버그" },
    { name: "우선순위", hint: "우선순위", sample: "높음" },
    { name: "담당자", hint: "담당자 이름", sample: "미지정" },
  ],
  "task.assigned": [...TASK_BASE, { name: "담당자", hint: "새 담당자 이름", sample: "운영자" }],
  "task.moved": [...TASK_BASE, { name: "상태", hint: "바뀐 상태 문장(앞 상태에서 새 상태로)", sample: "할 일에서 처리 중으로" },
    // 앞, 뒤 상태를 따로 둔 것은 취소선과 굵게로 가르려고(0094). 화살표 글자는 쓰지 않는다
    { name: "이전상태", hint: "바뀌기 전 상태", sample: "할 일" },
    { name: "새상태", hint: "바뀐 뒤 상태", sample: "처리 중" },
  ],
  "task.note": [...TASK_BASE, { name: "기록", hint: "기록 본문 앞부분", sample: "로그 확인했어요. 내일 다시 볼게요." }],
  "quality.run": [
    { name: "자동수정", hint: "자동으로 고친 건수", sample: "3" },
    { name: "신규", hint: "새로 확인이 필요한 건수", sample: "2" },
    { name: "미확인", hint: "확인 대기 중인 전체 건수", sample: "14" },
    { name: "실패", hint: "고치다 실패한 건수", sample: "0" },
    { name: "사례", hint: "자동 수정 사유 몇 줄(없으면 없다는 문구)", sample: "출시일 자리표시 12-31 을 비웠어요" },
    { name: "링크", hint: "데이터오류관리 주소", sample: "https://gamearound.kr/admin/data-issues" },
  ],
  "mail.password_reset": [
    { name: "링크", hint: "재설정 주소(발송 이력에는 가려서 남는다)", sample: "https://gamearound.kr/reset-password?token=sample" },
    { name: "유효시간", hint: "링크를 쓸 수 있는 분", sample: "30" },
  ],
  "mail.price_alert": [
    { name: "게임", hint: "게임 이름", sample: "하데스 II" },
    { name: "제목", hint: "알림 제목(할인 중, 가격이 내려갔어요)", sample: "하데스 II 할인 중" },
    { name: "내용", hint: "기종과 값, 할인율", sample: "Steam 27,000원 (30% 할인)" },
    { name: "링크", hint: "게임 상세 주소", sample: "https://gamearound.kr/games/hades-ii" },
  ],
  "mail.news_digest": [
    DIGEST_COUNT,
    { name: "목록", hint: "기사 제목, 매체를 줄마다 적은 글(링크 없음)", sample: "- 하데스 II 새 무기 공개 (IGN)\n- 붉은사막 출시일 확정 (게임메카)" },
    { name: "링크", hint: "맞춤 소식 화면 주소", sample: "https://gamearound.kr/news/mine" },
    { name: "설정링크", hint: "설정 화면 주소(받지 않기)", sample: "https://gamearound.kr/settings" },
  ],
  "mail.morning_alerts": [
    MORNING_COUNT,
    { name: "목록", hint: "밤사이 알림 글을 줄마다 적은 것", sample: "- 하데스 II 가격이 27,000원(으)로 내려갔어요\n- 찜한 '붉은사막' 20% 할인, 지금 55,840원이에요" },
    { name: "링크", hint: "알림함 주소", sample: "https://gamearound.kr/notifications" },
  ],
  "push.morning_alerts": [MORNING_COUNT, { name: "첫알림", hint: "가장 먼저 쌓인 알림 한 줄", sample: "하데스 II 가격이 27,000원(으)로 내려갔어요" }],
  "web.comment": [POST_TITLE],
  "web.reply": [POST_TITLE],
  "web.indie_comment": [GAME],
  "web.approved": [GAME],
  "web.rejected": [GAME],
  "web.price_drop": [GAME, PRICE],
  "web.price_met": [GAME, PRICE],
  "web.wish_sale": [GAME, PRICE, { name: "할인율", hint: "할인 퍼센트(숫자만)", sample: "30" }],
  "web.wish_record_low": [GAME, PRICE],
  "web.released": [GAME],
  "web.news_digest": [DIGEST_COUNT],
  "web.membership_renewed": [
    { name: "이용권", hint: "채워진 이용권 장 수", sample: "2" },
    { name: "다음결제일", hint: "다음 결제 날짜", sample: "2026. 12. 2." },
  ],
  "web.membership_failed": [{ name: "사유", hint: "카드사가 준 실패 사유", sample: "잔액 부족" }],
  "web.membership_ended": [],
  "push.price_sale": [GAME, PLATFORM, PRICE, { name: "할인율", hint: "할인 퍼센트(숫자만)", sample: "30" }],
  "push.price_drop": [GAME, PLATFORM, PRICE],
  "web.refunded": [
    { name: "상품", hint: "환불한 상품 이름", sample: "인디 부스트 7일" },
    { name: "금액", hint: "환불 금액", sample: "6,900원" },
  ],
};

export function isSystemTemplate(code: string): code is SystemTemplateCode {
  return code in SYSTEM_TEMPLATE_VARS;
}
