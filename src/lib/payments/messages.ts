// 결제 문구(부스트 구매 화면, 결제 결과, 내 결제 내역, 관리자 결제 목록). 2026-10-27.
import type { PaymentStatus } from "@/server/db/schema";
import type { ProductKey } from "./products";

/** 상품마다 구매 화면이 말하는 것(무엇을, 어디에, 얼마 동안) */
export const PRODUCT_COPY: Record<ProductKey, { title: string; lead: string; points: readonly string[] }> = {
  boost_indie_7d: {
    title: "광고 걸기",
    lead: "인디 게임 목록 맨 위 \"주목할 게임\" 칸에 내 게임을 올려요. 카드에는 \"광고\" 표시가 붙어요.",
    points: [
      "결제하면 바로 노출이 시작되고 7일 동안 이어져요",
      "이미 광고 중이면 지금 기간이 끝난 뒤로 이어 붙여요",
      "걸린 게임이 3개보다 많으면 한 시간마다 돌아가며 보여요",
      "명예의 전당, 슈퍼루키 순위와는 상관없어요",
    ],
  },
  pin_promo_7d: {
    title: "홍보 글 고정",
    lead: "게시판 홍보 목록 맨 위에 내 글을 고정해요. 줄에는 \"광고\" 표시가 붙어요.",
    points: [
      "결제하면 바로 고정되고 7일 동안 이어져요",
      "이미 고정 중이면 지금 기간이 끝난 뒤로 이어 붙여요",
      "고정된 글이 2개보다 많으면 한 시간마다 돌아가며 보여요",
      "숨김 처리된 글은 고정 기간 중에도 보이지 않아요",
    ],
  },
};

export const PAYMENT_MESSAGES = {
  adBuy: "광고 걸기",
  price: "결제 금액",
  pay: "결제하기",
  testMode: "테스트 결제예요. 실제로 돈이 나가지 않아요",
  notConfigured: "결제를 준비하고 있어요. 조금 뒤에 다시 와 주세요",
  notBuyable: "공개 중인 내 글에만 광고를 걸 수 있어요",
  notLive: "공개 중인 글에만 광고를 걸 수 있어요",
  currentBoost: (until: string) => `지금 광고 중이에요. ${until}까지 노출돼요`,
  orderNotFound: "주문을 찾을 수 없어요",
  amountMismatch: "결제 금액이 주문과 달라 결제를 멈췄어요",
  failed: "결제하지 못했어요",
  sdkFailed: "결제창을 열지 못했어요. 잠시 뒤 다시 시도해 주세요",

  historyTitle: "결제 내역",
  historyLead: "광고 결제 기록이에요. 영수증은 결제마다 따로 볼 수 있어요.",
  historyEmpty: "아직 결제한 적이 없어요",
  paidBanner: "결제가 끝났어요. 광고가 걸렸어요",
  failedBanner: (msg: string) => `결제하지 못했어요. ${msg}`,
  receipt: "영수증",
  boostMissing: "광고 걸기 확인 중",
  toHistory: "결제 내역",
  toStats: "내 게임 통계로",

  adminTitle: "최근 결제",
  adminEmpty: "아직 승인된 결제가 없어요",
  adminBoostMissing: "부스트가 걸리지 않았어요. 위에서 직접 걸어 주세요",

  refundRequest: "환불 요청",
  refundRequestPlaceholder: "환불 사유를 적어 주세요(선택)",
  refundRequestSend: "요청 보내기",
  refundRequested: "환불 요청함. 확인 뒤 돌려드려요",
  refundNotAllowed: "환불할 수 없는 결제예요",
  refundNothingLeft: "남은 기간이 없어 돌려줄 금액이 없어요",
  refundDefaultReason: "고객 요청",
  refunded: (amount: string) => `환불 ${amount}`,
  refundedNotice: (product: string, amount: string) => `${product} 결제 중 ${amount}을 환불했어요`,
  adminRefund: "환불",
  adminRefundFull: "전액 환불",
  adminRefundProrated: (amount: string) => `남은 기간 환불 ${amount}`,
  adminRefundReason: "환불 사유",
  adminRefundDone: (amount: string) => `${amount}을 환불했어요`,
  adminRefundRequested: "환불 요청",
} as const;

export const PAYMENT_STATUS_LABEL: Record<PaymentStatus, string> = {
  pending: "결제 중",
  paid: "결제 완료",
  failed: "실패",
  canceled: "취소",
};
