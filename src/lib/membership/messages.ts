// 메이커 멤버십 문구(내 멤버십 화면, 카드 등록 결과, 이용권 쓰기, 알림함, 관리자 목록). 2026-10-27.
import type { MembershipStatus } from "@/server/db/schema";

export const MEMBERSHIP_MESSAGES = {
  title: "메이커 멤버십",
  lead: "인디 개발자를 위한 월 구독이에요. 매달 노출 이용권이 채워져요.",
  /** 혜택 목록은 요금 설정(lib/pricing/settings 의 copy.membership.benefits)으로 옮겼다 — 관리자가 고친다 */
  creditsWorth: (n: number, value: string) => `노출 이용권 ${n}장(따로 사면 ${value})`,
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
  ended: "메이커 멤버십이 끝났어요. 다시 시작하려면 카드를 등록해 주세요",

  startedBanner: (n: number) => `메이커 멤버십을 시작했어요. 이용권 ${n}장이 채워졌어요`,
  failedBanner: (msg: string) => `시작하지 못했어요. ${msg}`,
  alreadyActive: "이미 메이커 멤버십을 이용 중이에요",
  failed: "처리하지 못했어요",
  notOwnCustomer: "카드 등록 정보가 맞지 않아요",

  spendCredit: (n: number) => `이용권으로 걸기(남은 ${n}장)`,
  creditUsed: "이용권으로 노출을 시작했어요",
  noCredit: "쓸 수 있는 이용권이 없어요",
  orPay: "또는 바로 결제",

  noticeRenewed: (next: string, n: number) => `메이커 멤버십이 갱신됐어요. 이용권 ${n}장이 채워졌고 다음 결제는 ${next}이에요`,
  notOnSale: "지금은 메이커 멤버십 가입을 받지 않아요",
  noticeFailed: (msg: string) => `메이커 멤버십 결제에 실패했어요(${msg}). 내일 다시 결제해요. 카드를 확인해 주세요`,
  noticeEnded: "메이커 멤버십이 끝났어요",

  adminTitle: "멤버십회원관리",
  adminLead: "매달 자동 결제로 이용 중인 구독자예요. 결제가 실패하면 다음 날 다시 청구하고, 환불은 결제/환불관리 화면에서 해요.",
  adminPaymentsLink: "결제/환불관리 보기",
  // ---- 멤버십회원관리 화면 구성(2026-10-29 밤, 백오피스 고객상세정보 꼴: 조회조건, 왼쪽 회원 목록, 오른쪽 묶음 상세) ----
  adminSearch: "조회조건",
  adminSearchStatus: "상태",
  adminSearchMember: "회원 이메일",
  adminSearchAll: "전체",
  adminListLabel: "회원 목록",
  adminPickHint: "왼쪽 목록에서 회원을 선택해 주세요",
  adminSectionMember: "회원 정보",
  adminSectionPlan: "구독 정보",
  adminSectionBilling: "결제 정보",
  adminFieldPlan: "요금제",
  adminFieldFailures: "연속 실패",
  adminFieldFailMessage: "마지막 실패 사유",
  adminNoFailure: "없음",
  adminEmpty: "아직 메이커 멤버십 구독자가 없어요",
  adminStatActive: "이용 중",
  adminStatCanceling: "해지 예약",
  adminStatPastDue: "결제 실패",
  adminStatMonthly: "다음 달 청구 예상",
  adminStatMonthlyHint: "이용 중 구독자의 다음 갱신 값 합이에요",
  adminStatPeople: (n: number) => `${n}명`,
  adminFailed: (n: number) => `연속 실패 ${n}회`,
  /** 구독자 표 머리(2026-10-29, 줄마다 " | " 로 이어 붙인 한 줄을 칸으로 폈다) */
  adminColStatus: "상태",
  adminColMember: "구독자",
  adminColCard: "카드",
  adminColPeriod: "이용 기간",
  adminColAmount: "금액",
} as const;

export const MEMBERSHIP_STATUS_LABEL: Record<MembershipStatus, string> = {
  active: "이용 중",
  canceling: "해지 예약",
  past_due: "결제 실패",
  ended: "끝남",
};
