// 관리자 "요금, 프로모션" 화면 문구(2026-10-28, /admin/pricing).
import type { PricedKey } from "@/lib/pricing/settings";

export const PRICING_ADMIN_MESSAGES = {
  lead: "만드는 사람에게 파는 상품의 값, 요금 카드 문구, 멤버십 혜택, 프로모션을 고쳐요. 저장하면 바로 요금 화면과 다음 주문부터 바뀌어요.",
  preview: "요금 화면 보기",
  save: "저장",
  saving: "저장 중",
  saved: "저장했어요",
  failed: "저장하지 못했어요. 칸을 확인해 주세요",
  invalid: "비었거나 범위를 벗어난 칸이 있어요",
  reset: "되돌리기",
  dirty: "저장하지 않은 바뀐 값이 있어요",

  pricesTitle: "값과 판매",
  pricesLead: "값은 원 단위예요(100원 이상). 판매를 끄면 요금 화면에서 그 단이 빠지고 새 주문, 새 가입을 받지 않아요. 이용 중인 멤버십 갱신은 그대로 가요.",
  onSale: "판매",
  amount: "값(원)",
  /** 값 칸 안 오른쪽 끝 단위. 줄마다 "값(원)" 이름표를 세우던 자리를 대신한다(2026-10-28) */
  won: "원",
  credits: "매달 노출 이용권(장)",
  membershipNote: "멤버십 값을 바꾸면 이용 중인 사람도 다음 갱신부터 새 값이에요",

  copyTitle: "요금 카드 문구",
  copyLead: "줄은 한 줄에 하나씩 써요. \"이름: 설명\" 꼴이면 이름만 굵게 보여요. {saving} 은 묶음이 아끼는 금액, {credits} 는 이용권 수, {price} 는 첫 단 값으로 바뀌어요.",
  fields: {
    name: "이름",
    eyebrow: "이름 위 작은 줄",
    summary: "한 줄 정의",
    tag: "딱지(비우면 없음)",
    now: "값 아래 강조 줄",
    base: "혜택 머리(예: 스파크에 더해)",
    lines: "혜택 줄",
    hint: "카드 아래 덧말",
    cta: "단추 글",
    benefits: "멤버십 화면 혜택 목록",
  },

  promosTitle: "프로모션",
  promosLead: "여럿이 걸리면 가장 싼 값 하나만 써요(겹쳐 깎지 않아요). 멤버십 프로모션은 첫 달 결제에만 걸려요. 기간을 비우면 끝없이 이어져요.",
  promosEmpty: "프로모션이 없어요",
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
} as const;

export const PRICED_KEY_LABELS: Record<PricedKey, string> = {
  boost_indie_7d: "인디 게임 부스트 7일",
  pin_promo_7d: "홍보 글 고정 7일",
  bundle_7d: "묶음(부스트 + 고정) 7일",
  membership: "메이커 멤버십(첫 달)",
};

export const TIER_LABELS = { single: "첫 단(낱개)", bundle: "둘째 단(묶음)", membership: "셋째 단(멤버십)" } as const;
