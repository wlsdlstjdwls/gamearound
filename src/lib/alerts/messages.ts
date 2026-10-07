// 가격 알림 화면 문구(2026-10-07 고도화 때 화면, 폼에 흩어져 있던 말을 모았다). "-해요" 체.
import { formatPrice } from "@/lib/currency";

export const ALERT_MESSAGES = {
  title: "가격 알림",
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
  emptyDescription: "게임 상세의 '할인 알림 받기' 에서 할인율이나 목표가를 정하면, 그 값이 되는 순간 알려 드려요",
  emptyAction: "게임 둘러보기",
  notFound: (slug: string) => `'${slug}' 게임을 찾지 못했어요`,
  allPlatforms: "전체 플랫폼",
  paused: "꺼 둠",
  editCondition: "조건 바꾸기",
  remove: "알림 지우기",
  removeConfirm: "이 알림을 지울까요?",
  toggle: "알림 켜기, 끄기",
  priceUnknown: "아직 값을 모르는 게임이에요",
  metLabel: "조건 충족",
  lastSent: (date: string) => `마지막 알림 ${date}`,
  neverSent: "아직 보낸 알림 없음",
  /** 폼 */
  formNew: "새 알림",
  formEdit: "알림 조건 바꾸기",
  formPlatform: "알림 받을 플랫폼",
  formMode: "무엇을 기준으로 알릴까요",
  modeDiscount: "할인율",
  modePrice: "목표가",
  formDiscountLabel: "이 정도 할인이면 알려 주세요",
  formDiscountHint: "1% 로 두면 할인이 시작될 때마다 알려요",
  formPriceLabel: "이 값 이하로 내려가면 알려 주세요",
  formPriceHint: "원화로 파는 스토어에만 견줘요. 지금 최저가보다 낮게 정해야 알림이 와요",
  formSendRule: "조건에 맞으면 웹푸시로 한 번 보내요",
  formSubmit: "알림 만들기",
  formSubmitEdit: "조건 저장",
  formPending: "저장 중이에요",
} as const;

/** 알림 한 줄의 조건 글. 할인율이면 "-40% 이상", 목표가면 "₩30,000 이하" */
export function conditionText(minDiscountPct: number | null, targetPrice: number | null): string {
  if (targetPrice !== null && minDiscountPct === null) return `${formatPrice(targetPrice)} 이하`;
  return `할인 ${minDiscountPct ?? 1}% 이상`;
}

/** 조건까지 남은 거리 글 */
export function gapText(gap: { kind: "discount"; pct: number } | { kind: "price"; amount: number }): string {
  return gap.kind === "discount" ? `할인율 ${gap.pct}%p 남았어요` : `${formatPrice(gap.amount)} 더 내려야 해요`;
}
