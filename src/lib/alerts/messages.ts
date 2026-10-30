// 가격 알림 화면 문구(2026-10-07 고도화 때 화면, 폼에 흩어져 있던 말을 모았다). "-해요" 체.
import { formatPrice } from "@/lib/currency";

/** "어떤 때 알려 주나" 한 문장. 목록 머리와 팝업(M-02) 머리가 같은 말을 해야 해서 한 자리에 둔다 */
const PRICE_ALERT_LEAD = "고른 플랫폼에서 다음 할인이 시작되면 알려 드려요";

export const ALERT_MESSAGES = {
  title: "가격 알림",
  lead: `${PRICE_ALERT_LEAD}. 수정을 누르면 플랫폼과 받는 방법을 다시 고를 수 있어요.`,
  pushSettings: "푸시 설정",
  /** 머리 숫자 셋의 이름 */
  statActive: "켜 둔 알림",
  statMet: "지금 조건에 맞아요",
  statSent: "최근 7일 보낸 알림",
  /** 푸시를 안 켠 사람 — 알림을 만들어도 아무것도 안 온다. 이걸 모르고 기다리는 게 가장 나쁜 경우다 */
  pushOff: "이 기기에서 푸시를 안 켜 두셨어요. 알림이 조건에 맞아도 받을 수 없어요",
  pushOffAction: "푸시 켜기",
  listTitle: "내 알림",
  emptyTitle: "아직 만든 알림이 없어요",
  /** 팝업(M-02)이 플랫폼과 받는 방법만 고르는 모양이 된 뒤의 말(2026-10-26). 할인율, 목표가는 이 화면 폼의 일이다 */
  emptyDescription: "게임 상세의 '가격 알림 받기' 에서 플랫폼과 받는 방법을 고르면 여기에 모여요",
  emptyAction: "게임 둘러보기",
  notFound: (slug: string) => `'${slug}' 게임을 찾지 못했어요`,
  allPlatforms: "전체 플랫폼",
  paused: "꺼 둠",
  editCondition: "조건 바꾸기",
  /** 목록 줄의 "수정" — 가격 알림 팝업(M-02)을 다시 연다 */
  edit: "수정",
  /** 목록 줄의 미리보기(기획서 v2.0 S-26, components/alerts/alert-preview) */
  preview: "알림 미리보기",
  previewTitle: "이렇게 알려 드려요",
  previewNow: "지금 조건에 맞는 값으로 보여 드려요. 값이 더 내려가는 순간 이렇게 와요.",
  previewSample: "조건에 맞는 순간을 가정한 예시 값이에요. 실제 값은 그때의 스토어 가격으로 와요.",
  previewWeb: "푸시 알림",
  previewInbox: "알림함에는 이렇게 남아요:",
  previewEmail: "이메일",
  previewEmailTo: "가입한 이메일로 보내요",
  previewEmailLink: "게임 보러 가기",
  remove: "알림 지우기",
  removeConfirm: "이 알림을 지울까요?",
  /** 목록은 게임 한 줄에 플랫폼 알림을 묶는다 — 지우기는 그 묶음 전부다 */
  removeGroupConfirm: "이 게임에 걸린 알림을 모두 지울까요?",
  /** 지우기 확인 팝업(ui/confirm-dialog). 브라우저 confirm 을 걷었다(2026-10-28 사용자) */
  removeConfirmLead: "지운 알림은 되돌릴 수 없어요. 다시 받으려면 새로 만들어야 해요.",
  removeConfirmAction: "지우기",
  removeConfirmCancel: "취소",
  /** 목록 줄에서 플랫폼 칩 묶음의 이름(스크린 리더) */
  platformsLabel: "알림 받을 플랫폼",
  toggle: "알림 켜기, 끄기",
  priceUnknown: "아직 값을 모르는 게임이에요",
  metLabel: "조건 충족",
  /** 목록 줄의 진척 막대 옆 글자(lib/alerts/condition 의 alertProgress) */
  progress: (pct: number) => `조건까지 ${pct}%`,
  progressLabel: "조건에 다가간 정도",
  lastSent: (date: string) => `마지막 알림 ${date}`,
  neverSent: "아직 보낸 알림 없음",
  /** 폼 */
  formNew: "새 알림",
  formEdit: "알림 조건 바꾸기",
  formPlatform: "알림 받을 플랫폼",
  formPlatformMulti: "여러 개 고를 수 있어요",
  formMode: "무엇을 기준으로 알릴까요",
  modeDiscount: "할인율",
  modePrice: "목표가",
  formDiscountLabel: "이 정도 할인이면 알려 주세요",
  formDiscountHint: "1% 로 두면 할인이 시작될 때마다 알려요",
  formPriceLabel: "이 값 이하로 내려가면 알려 주세요",
  formPriceHint: "원화로 파는 스토어에만 견줘요. 지금 최저가보다 낮게 정해야 알림이 와요",
  formSubmit: "알림 만들기",
  formSubmitEdit: "조건 저장",
  formPending: "저장 중이에요",
} as const;

/** 알림 한 줄의 조건 글. 할인율이면 "-40% 이상", 목표가면 "30,000원 이하" */
export function conditionText(minDiscountPct: number | null, targetPrice: number | null): string {
  if (targetPrice !== null && minDiscountPct === null) return `${formatPrice(targetPrice)} 이하`;
  return `할인 ${minDiscountPct ?? 1}% 이상`;
}

/** 조건까지 남은 거리 글 */
export function gapText(gap: { kind: "discount"; pct: number } | { kind: "price"; amount: number }): string {
  return gap.kind === "discount" ? `할인율 ${gap.pct}%p 남았어요` : `${formatPrice(gap.amount)} 더 내려야 해요`;
}

/** 상세 화면 가격 알림 팝업(components/price-alert-button, 기획서 v2.0 M-02) */
export const PRICE_ALERT_MESSAGES = {
  cta: "가격 알림 받기",
  /** 상세 히어로 단추가 걸린 알림을 말할 때(2026-10-30 사용자 "가격 알림도 색 구분"). 안 걸렸으면 단추가 넘겨받은 이름 그대로다 */
  state: { on: "알림 받는 중", paused: "알림 멈춤" },
  /** 출시 예정 게임의 "출시 알림 받기" 로 열면 release 다(목업 alm 의 g.up) */
  title: { price: "가격 알림 설정", release: "출시 알림 설정" },
  lead: { price: PRICE_ALERT_LEAD, release: "고른 플랫폼에서 출시되면 알려 드려요" },
  platformsLegend: "알림 받을 플랫폼",
  channelLegend: "알림 받는 방법",
  // "웹 알림" 과 "웹푸시" 를 화면에서 "푸시 알림" 하나로 부른다(2026-10-27, 사용자: "웹푸시, 앱푸시 나눠야 되나? 푸시 알림으로 통일") — 값 이름(web)은 그대로
  channel: { web: "푸시 알림", email: "이메일" },
  emailNote: "가입한 이메일로 보내요. 메일 발송이 준비되기 전에는 푸시 알림으로 대신 보내요.",
  noPrice: "가격 확인 중",
  save: "저장",
  saved: { price: "가격 알림을 저장했어요", release: "출시 알림을 저장했어요" },
  cancel: "취소",
  /** 이미 알림이 걸린 게임에만 선다. 누르면 팝업을 닫고 바로 지운다 — 실패하면 팝업을 다시 연다 */
  remove: "알림 삭제",
  removed: "알림을 지웠어요",
  removeFailed: "알림을 지우지 못했어요. 잠시 뒤 다시 해 주세요",
  failed: "저장하지 못했어요. 잠시 뒤 다시 해 주세요",
  advanced: "목표가, 할인율로 자세히 정하기",
} as const;
