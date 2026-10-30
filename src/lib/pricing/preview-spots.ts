// 요금 카드 미리 보기의 자리 이름(2026-10-30, components/admin/screen/preview-spot).
// 관리자 폼 칸과 카드(components/payments/plan-cards)의 data-preview-spot 이 이 이름으로 짝을 맺는다.
// 문구 자리는 문구 칸 이름(copy 의 키)과 같게 둔다 — 문구 판(pricing-form/copy-section)이 칸 이름을 그대로 자리로 쓴다.
// 이름을 바꾸면 양쪽이 같이 바뀐다. 짝이 없는 이름은 아무것도 강조하지 않을 뿐 깨지지는 않는다.
export const PLAN_SPOTS = {
  /** 카드 한 장 전체 — 판매 켜고 끄기처럼 카드가 통째로 서고 지는 칸 */
  card: "card",
  /** 큰 값과 그은 값, 할인 딱지 — 값, 할인, 프로모션 칸 */
  price: "price",
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
