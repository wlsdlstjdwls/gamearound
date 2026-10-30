// 프로모션 약속 — 가입 때 받은 멤버십 할인을 몇 달 지키는가, 시작한 프로모션의 조건을 못 바꾸게 하는 규칙(2026-10-30).
//
// 사용자 말(같은 날): "3개월 할인 고객이 그 프로모션으로 결제했으면, 프로모션이 중지되더라도(신규 중지) 그 고객에게는 적용돼야 한다",
// "이미 진행 중인 프로모션은 중지만 할 수 있게", "기존 회원을 어떻게 할지도 정할 수 있게".
//
// 그래서 멤버십 첫 청구 때 걸린 프로모션을 멤버십 줄에 통째로 받아 둔다(schema-memberships 의 promo_*: id, 노출명, 할인가, 개월, 낸 횟수).
// 갱신 청구는 요금 설정의 지금 프로모션이 아니라 이 받아 둔 값으로 매긴다 — 관리자가 나중에 값을 바꿔도 가입 때 약속이 그대로다.
// 예외는 하나: 관리자가 그 프로모션을 "기존 회원도 중지"(stopScope all)로 멈추면 다음 청구부터 정가다.
// 정가가 받아 둔 할인가보다 낮아지면 정가를 받는다 — 할인 약속이 정가보다 비싸게 받는 근거가 되면 안 된다.
//
// 이 파일은 순수 함수다(테스트를 붙인다). DB 를 읽고 쓰는 일은 services/membership/charge 가 한다.
import { promoMonthsOf, promotionStarted } from "@/lib/pricing/quote";
import type { PricingSettings, Promotion } from "@/lib/pricing/settings";

/** 멤버십 줄에 받아 둔 프로모션. months 0 = 매달 계속, paid = 이 할인으로 이미 낸 월 결제 수 */
export type MembershipGrant = { promoId: string; label: string; amount: number; months: number; paid: number };

/** 멤버십 줄의 promo_* 칸을 받은 혜택으로. 칸이 하나라도 비면 받은 혜택이 없는 것이다 */
export function grantFromRow(m: { promoId: string | null; promoLabel: string | null; promoAmount: number | null; promoMonths: number | null; promoPaid: number | null }): MembershipGrant | null {
  if (m.promoId === null || m.promoLabel === null || m.promoAmount === null || m.promoMonths === null || m.promoPaid === null) return null;
  return { promoId: m.promoId, label: m.promoLabel, amount: m.promoAmount, months: m.promoMonths, paid: m.promoPaid };
}

/** 이번 갱신 청구 값과, 청구가 성공하면 멤버십 줄에 남길 받은 혜택(다 썼거나 거둬졌으면 null) */
export function renewalCharge(grant: MembershipGrant | null, s: PricingSettings): { amount: number; grant: MembershipGrant | null } {
  const regular = s.membership.amount;
  if (!grant) return { amount: regular, grant: null };
  // 지운 프로모션은 거둔 것으로 보지 않는다 — 시작한 프로모션은 지울 수 없지만(관리자 화면), 지워졌어도 가입 때 약속은 남는다
  const p = s.promotions.find((x) => x.id === grant.promoId);
  const revoked = p !== undefined && !p.active && p.stopScope === "all";
  const left = grant.months === 0 || grant.paid < grant.months;
  if (revoked || !left) return { amount: regular, grant: null };
  return { amount: Math.min(grant.amount, regular), grant: { ...grant, paid: grant.paid + 1 } };
}

/** 시작한 프로모션에서 바꿀 수 없는 칸. 진행상태(active), 중단 사유, 중지 범위, 관리자용 코드명, 배지 색은 바꿀 수 있다 */
const TERM_KEYS = ["label", "target", "kind", "value", "audience", "startsOn", "endsOn"] as const satisfies readonly (keyof Promotion)[];

function sameTerms(a: Promotion, b: Promotion): boolean {
  return TERM_KEYS.every((k) => (a[k] ?? null) === (b[k] ?? null)) && promoMonthsOf(a) === promoMonthsOf(b);
}

/** 저장된 프로모션 중 시작한 것인가 — 관리자 화면이 이 줄의 조건 칸을 잠근다 */
export function promotionLocked(saved: Promotion | undefined, now: Date): boolean {
  return saved !== undefined && promotionStarted(saved, now);
}

/** 저장하려는 값에서 시작한 프로모션의 조건을 바꾸거나 지운 것의 id. 저장 액션이 막는다(화면 잠금을 건너뛴 요청까지) */
export function lockedPromotionEdits(before: PricingSettings, after: PricingSettings, now: Date): string[] {
  return before.promotions
    .filter((p) => promotionStarted(p, now))
    .filter((p) => {
      const next = after.promotions.find((x) => x.id === p.id);
      return !next || !sameTerms(p, next);
    })
    .map((p) => p.id);
}
