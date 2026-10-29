// 관리자 "상품등록"(/admin/pricing), "프로모션등록"(/admin/discounts) 화면 문구(2026-10-28, 2026-10-29 화면을 둘로 나눔).
import type { CatalogProduct } from "@/lib/pricing/settings";

export const PRICING_ADMIN_MESSAGES = {
  lead: "개발자에게 파는 광고 상품과 멤버십, 요금 카드 문구를 정해요. 저장하면 요금 화면과 다음 주문부터 바로 바뀌어요.",
  discountsLead: "기간을 정해 값을 깎아 줘요. 저장하면 요금 화면과 다음 주문부터 바로 걸려요.",
  preview: "요금 화면 열기",
  /** 요금 화면은 새 탭으로 연다(2026-10-29 사용자) — 고치던 폼을 떠나지 않고 실제 화면과 견준다 */
  newWindow: "(새 창에서 열림)",
  previewTitle: "미리 보기",
  previewTier: "보고 있는 카드",
  save: "저장",
  saveShortcut: "저장 (Ctrl+S)",
  /** 판매 상품 표에서 저장 전 바뀐 줄의 꼬리표(백오피스의 변경 행 표시) */
  changed: "바뀜",
  saving: "저장 중",
  saved: "저장했어요",
  failed: "저장하지 못했어요. 칸을 확인해 주세요",
  invalid: "비었거나 범위를 벗어난 칸이 있어요",
  reset: "되돌리기",
  dirty: "저장하지 않은 바뀐 값이 있어요",

  pricesTitle: "판매 상품",
  pricesLead: "광고 상품을 더하고 지울 수 있어요. 새 상품은 판매가 꺼진 채로 생겨요. 판매를 끄면 요금 화면에서 빠지고 새 주문을 받지 않아요.",
  addProduct: "상품 추가",
  newProductName: "새 광고 상품",
  newRow: "새 상품",
  remove: "지우기",
  removeProduct: (name: string) => `${name} 지우기`,
  removedNote: (n: number) => `지운 상품 ${n}개는 저장하면 사라져요(걸린 프로모션도 같이)`,
  productsEmpty: "광고 상품이 없어요. 상품 추가를 눌러 만들어요",
  productsFull: (n: number) => `상품은 ${n}개까지 만들 수 있어요`,
  /** 프로모션 대상이 지운 상품일 때 */
  goneProduct: "지운 상품",
  colSlots: "자리",
  daysUnit: "일",
  /** 자리 고르기. 자리 둘이면 묶음이라 인디 게임과 홍보 글을 같이 고른다 */
  slotChoices: { indie: "인디 목록 맨 위", pin: "홍보 게시판 고정", both: "둘 다(묶음)" },
  /** 판매 상품 표의 머리 칸(2026-10-29 사용자 "공백이 많고 컴팩트하지 않다" — 묶음 판 둘을 표 한 장으로) */
  colProduct: "상품",
  colCycle: "기간",
  colPrice: "값",
  colCredits: "매달 이용권",
  cycleMonthly: "매달",
  creditsUnit: "장",
  onSale: "판매",
  /** 값 칸 안 오른쪽 끝 단위. 줄마다 "값(원)" 이름표를 세우던 자리를 대신한다(2026-10-28) */
  won: "원",
  membershipNote: "멤버십 값, 이용권을 바꾸면 이용 중인 구독자도 다음 갱신부터 새 값이에요",

  copyTitle: "요금 카드 문구",
  copyLead: "카드를 골라 문구를 고쳐요. 값이 바뀌는 자리는 칸 끝 \"값 넣기\" 를 누르거나 칸에서 [ 를 쳐서 넣어요.",
  /** 칸마다 붙는 자리표시 넣기 단추(pricing-form/token-menu). 칸에서 [ 를 쳐도 같은 목록이 뜬다 */
  tokenButton: "값 넣기",
  tokenButtonLabel: "자동으로 바뀌는 값 넣기",
  copyTabs: "고칠 카드",
  groupHead: "카드 머리",
  groupPrice: "값 아래",
  groupBenefits: "혜택",
  groupAction: "단추",
  /** 칸 이름은 "카드 어디에 서는가" 로 부른다(2026-10-29 사용자 "필드 이름이 뭐가 뭔지 모르겠다") */
  fields: {
    name: "카드 이름",
    eyebrow: "이름 위 작은 글",
    summary: "한 줄 소개",
    tag: "이름 옆 딱지",
    now: "값 아래 파란 띠",
    base: "혜택 목록 제목",
    lines: "혜택 목록",
    hint: "카드 아래 빨간 안내",
    cta: "단추 글",
    benefits: "내 메이커 멤버십 화면의 혜택 목록",
  },
  fieldHints: {
    name: "카드 맨 위 큰 글자예요",
    eyebrow: "기간이나 종류를 짧게 적어요. 예: 7일 | 노출 자리 하나",
    summary: "이름 바로 아래 한 줄이에요",
    tag: "비우면 안 보여요. 예: 추천",
    now: "결제하면 바로 받는 것을 적어요",
    base: "앞 카드보다 더 주는 것을 소개하는 머리예요. 예: 스파크에 더해",
    lines: "한 줄에 하나씩 써요. \"이름: 설명\" 꼴이면 이름이 굵게 보여요",
    hint: "묶음 광고를 팔고 있을 때만 보여요",
    cta: "카드 맨 아래 단추에 들어가요",
    benefits: "구독 안내 화면에 나오는 목록이에요. 한 줄에 하나씩 써요",
  },

  promosTitle: "프로모션",
  promosLead: "여럿이 걸리면 가장 싼 값 하나만 써요(겹쳐 깎지 않아요). 메이커 멤버십 할인은 첫 달 결제에만 걸려요. 기간을 비우면 끝없이 이어져요.",
  promosEmpty: "프로모션이 없어요",
  /** 프로모션 표 머리와 고치는 판(2026-10-29, 목록 표 + 고른 줄 상세) */
  colPromo: "프로모션",
  colDeal: "할인",
  colPeriod: "기간",
  editTitle: "고르는 프로모션",
  editHint: "목록에서 줄을 누르면 여기서 고쳐요",
  addPromo: "프로모션 더하기",
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

/** 자리 고르기 칸의 값. 자리 목록(slots)을 셋 중 하나로 접는다 */
export const SLOT_CHOICES = ["indie", "pin", "both"] as const;
export type SlotChoice = (typeof SLOT_CHOICES)[number];

export function slotChoiceOf(slots: CatalogProduct["slots"]): SlotChoice {
  return slots.length > 1 ? "both" : slots[0] === "indie_top" ? "indie" : "pin";
}

/** 요금 카드 셋. 싼 것부터(components/payments/plan-cards) */
export const TIER_LABELS = { single: "낱개 광고", bundle: "묶음 광고", membership: "메이커 멤버십" } as const;
