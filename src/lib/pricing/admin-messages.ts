// 관리자 "상품과 가격"(/admin/pricing), "할인 행사"(/admin/discounts) 화면 문구(2026-10-28, 2026-10-29 화면을 둘로 나눔).
import type { PricedKey } from "@/lib/pricing/settings";

export const PRICING_ADMIN_MESSAGES = {
  lead: "개발자에게 파는 상품 셋의 값, 판매 여부, 요금 카드 문구를 정해요. 저장하면 요금 화면과 다음 주문부터 바로 바뀌어요.",
  discountsLead: "기간을 정해 값을 깎아 줘요. 저장하면 요금 화면과 다음 주문부터 바로 걸려요.",
  preview: "요금 화면 열기",
  previewTitle: "미리 보기",
  previewLead: "저장하기 전 지금 고친 값으로 그린 요금 카드예요. 처음 결제하는 사람 기준이에요.",
  save: "저장",
  saving: "저장 중",
  saved: "저장했어요",
  failed: "저장하지 못했어요. 칸을 확인해 주세요",
  invalid: "비었거나 범위를 벗어난 칸이 있어요",
  reset: "되돌리기",
  dirty: "저장하지 않은 바뀐 값이 있어요",

  pricesTitle: "판매 상품",
  pricesLead: "값은 원 단위예요(100원 이상). 판매를 끄면 요금 화면에서 그 카드가 빠지고 새 주문, 새 가입을 받지 않아요. 이용 중인 메이커 멤버십 갱신은 그대로 가요.",
  groupAds: "광고 상품(7일)",
  groupMembership: "구독 상품(매달)",
  onSale: "판매",
  amount: "값(원)",
  /** 값 칸 안 오른쪽 끝 단위. 줄마다 "값(원)" 이름표를 세우던 자리를 대신한다(2026-10-28) */
  won: "원",
  credits: "매달 노출 이용권(장)",
  membershipNote: "값을 바꾸면 이용 중인 구독자도 다음 갱신부터 새 값이에요",

  copyTitle: "요금 카드 문구",
  copyLead: "카드를 골라 고쳐요. 줄은 한 줄에 하나씩, \"이름: 설명\" 꼴이면 이름만 굵게 보여요. {saving} 은 묶음이 아끼는 금액, {credits} 는 이용권 수, {price} 는 낱개 값으로 바뀌어요.",
  copyTabs: "고칠 카드",
  groupHead: "카드 머리",
  groupPrice: "값 아래",
  groupBenefits: "혜택",
  groupAction: "단추",
  fields: {
    name: "이름",
    eyebrow: "이름 위 작은 줄",
    summary: "한 줄 정의",
    tag: "딱지(비우면 없음)",
    now: "값 아래 강조 줄",
    base: "혜택 머리(예: 낱개에 더해)",
    lines: "혜택 줄",
    hint: "카드 아래 덧말",
    cta: "단추 글",
    benefits: "메이커 멤버십 화면 혜택 목록",
  },

  promosTitle: "할인 행사",
  promosLead: "여럿이 걸리면 가장 싼 값 하나만 써요(겹쳐 깎지 않아요). 메이커 멤버십 할인은 첫 달 결제에만 걸려요. 기간을 비우면 끝없이 이어져요.",
  promosEmpty: "할인 행사가 없어요",
  addPromo: "할인 행사 더하기",
  removePromo: "지우기",
  promoActive: "켜기",
  promoLabel: "딱지 글(보는 사람에게 보여요)",
  promoTarget: "대상",
  promoKind: "할인 방식",
  promoValue: "값",
  promoAudience: "누구에게",
  promoStarts: "시작일",
  promoEnds: "끝일",
  kindLabels: { percent: "비율(%)", price: "이 값으로(원)" },
  audienceLabels: { all: "누구나", first: "처음 결제하는 사람만" },
  newPromoLabel: "첫 결제 할인",
  phaseLabels: { off: "꺼짐", upcoming: "시작 전", live: "진행 중", ended: "끝남" },
  /** 줄 머리 한 문장. 칸 여덟을 읽지 않아도 무엇이 누구에게 얼마나 걸리는지 보이게 */
  promoSummary: (target: string, audience: string, deal: string, period: string) => `${target}, ${audience}, ${deal}, ${period}`,
  dealPercent: (n: number) => `${n}% 할인`,
  dealPrice: (won: string) => `${won}에`,
  periodAlways: "기간 제한 없음",
  periodRange: (from: string, to: string) => `${from} ~ ${to}`,
  periodOpen: "제한 없음",
} as const;

/** 상품 이름. 관리자 화면에서는 "어느 자리에 며칠" 로 부른다 — 카드 이름(스파크 등)은 관리자가 바꾸는 값이라 기준이 못 된다 */
export const PRICED_KEY_LABELS: Record<PricedKey, string> = {
  boost_indie_7d: "인디 목록 맨 위",
  pin_promo_7d: "홍보 게시판 고정",
  bundle_7d: "묶음(맨 위 + 고정)",
  membership: "메이커 멤버십",
};

/** 요금 카드 셋. 싼 것부터(components/payments/plan-cards) */
export const TIER_LABELS = { single: "낱개 광고", bundle: "묶음 광고", membership: "메이커 멤버십" } as const;
