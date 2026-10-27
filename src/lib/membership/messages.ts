// 메이커 멤버십 문구(내 멤버십 화면, 카드 등록 결과, 이용권 쓰기, 알림함, 관리자 목록). 2026-10-27.
import type { MembershipStatus } from "@/server/db/schema";

export const MEMBERSHIP_MESSAGES = {
  title: "메이커 멤버십",
  lead: "인디 개발자를 위한 월 구독이에요. 매달 광고 이용권이 채워져요.",
  perMonth: "매달",
  benefits: [
    "매달 광고 이용권 2장. 한 장이면 인디 목록 맨 위 또는 홍보 글 고정을 7일 걸 수 있어요",
    "남은 이용권은 다음 달로 넘어가지 않아요",
    "해지해도 이번 기간이 끝날 때까지 이용권을 쓸 수 있어요",
    "결제는 등록한 카드로 매달 같은 날 자동으로 나가요",
  ],
  start: "카드 등록하고 시작하기",
  notConfigured: "정기결제를 준비하고 있어요. 조금 뒤에 다시 와 주세요",
  testMode: "테스트 결제예요. 실제로 돈이 나가지 않아요",
  sdkFailed: "카드 등록 창을 열지 못했어요. 잠시 뒤 다시 시도해 주세요",

  statusLabel: "상태",
  card: "결제 카드",
  period: "이번 기간",
  nextCharge: "다음 결제",
  credits: "남은 이용권",
  creditsCount: (n: number) => `${n}장`,
  cancel: "해지하기",
  canceled: "해지를 예약했어요",
  cancelNote: (until: string) => `${until}까지 이용하고 끝나요. 더 결제되지 않아요`,
  resume: "해지 취소",
  resumed: "다시 이어 가요",
  pastDue: (msg: string, retry: string) => `지난 결제에 실패했어요(${msg}). ${retry}에 다시 결제해요`,
  ended: "멤버십이 끝났어요. 다시 시작하려면 카드를 등록해 주세요",

  startedBanner: "멤버십을 시작했어요. 이용권 2장이 채워졌어요",
  failedBanner: (msg: string) => `시작하지 못했어요. ${msg}`,
  alreadyActive: "이미 멤버십을 이용 중이에요",
  failed: "처리하지 못했어요",
  notOwnCustomer: "카드 등록 정보가 맞지 않아요",

  spendCredit: (n: number) => `이용권으로 걸기(남은 ${n}장)`,
  creditUsed: "이용권으로 광고를 걸었어요",
  noCredit: "쓸 수 있는 이용권이 없어요",
  orPay: "또는 바로 결제",

  noticeRenewed: (next: string) => `메이커 멤버십이 갱신됐어요. 이용권 2장이 채워졌고 다음 결제는 ${next}이에요`,
  noticeFailed: (msg: string) => `메이커 멤버십 결제에 실패했어요(${msg}). 내일 다시 결제해요. 카드를 확인해 주세요`,
  noticeEnded: "메이커 멤버십이 끝났어요",

  adminTitle: "멤버십",
  adminLead: "메이커 멤버십 가입자예요. 결제와 환불은 유료 노출 화면의 결제 목록에서 해요.",
  adminPaymentsLink: "결제 목록 보기",
  adminEmpty: "아직 멤버십 가입자가 없어요",
  adminFailed: (n: number) => `연속 실패 ${n}회`,
} as const;

export const MEMBERSHIP_STATUS_LABEL: Record<MembershipStatus, string> = {
  active: "이용 중",
  canceling: "해지 예약",
  past_due: "결제 실패",
  ended: "끝남",
};
