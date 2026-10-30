// 요금 카드 미리 보기의 자리 이름(2026-10-30, components/admin/screen/preview-spot).
// 관리자 폼 칸과 카드(components/payments/plan-cards)의 data-preview-spot 이 이 이름으로 짝을 맺는다.
// 문구 자리는 문구 칸 이름(copy 의 키)과 같게 둔다 — 문구 판(pricing-form/copy-section)이 칸 이름을 그대로 자리로 쓴다.
// 이름을 바꾸면 양쪽이 같이 바뀐다. 짝이 없는 이름은 아무것도 강조하지 않을 뿐 깨지지는 않는다.
// 폼 칸 하나가 여러 자리를 움직이면 이름을 띄어 이어 준다(spots(...)) — 할인 값은 판매가와 할인율을 함께 바꾼다.
export const PLAN_SPOTS = {
  /** 카드 한 장 전체 — 판매 켜고 끄기처럼 카드가 통째로 서고 지는 칸 */
  card: "card",
  /** 가격 영역 전체(그은 값부터 아래 줄까지) */
  price: "price",
  /** 가격 영역 조각(components/payments/price-tag). 프로모션 칸은 바꾸는 조각만 가리킨다(2026-10-30 사용자 "프로모션은 크게만 표시") */
  /** 판매가(큰 값) */
  amount: "amount",
  /** 그은 정가 */
  list: "list",
  /** 할인율 배지 */
  rate: "rate",
  /** 프로모션 노출명 배지 */
  promo: "promo",
  /** 적용 조건 — 큰 값 앞 "첫 달", 아래 줄 "다음 달부터", 절약 금액 */
  terms: "terms",
  eyebrow: "eyebrow",
  name: "name",
  summary: "summary",
  tag: "tag",
  now: "now",
  base: "base",
  lines: "lines",
  hint: "hint",
  cta: "cta",
} as const;

export type PlanSpot = (typeof PLAN_SPOTS)[keyof typeof PLAN_SPOTS];

/** 칸 하나가 움직이는 자리 여럿을 한 값으로(screen/preview-spot 이 띄어쓰기로 가른다) */
export function spots(...names: PlanSpot[]): string {
  return names.join(" ");
}
