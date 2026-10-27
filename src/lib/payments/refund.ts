// 환불 금액 셈(2026-10-27, 기획서 5장 "기간형 상품 일할 환불", 8장 "환불(전액, 일할)"). 관리자 화면과 환불 서비스가 같은 셈을 본다.
//
// 일할은 "아직 노출되지 않은 시간" 의 몫이다. 날 단위로 자르지 않고 밀리초 비율로 나눈다 — 하루 안에서 환불해도 쓴 만큼만 뺀다.
// 원 아래는 버린다(돌려주는 쪽이 1원을 더 주지 않는다). 관리자가 먼저 회수한 부스트는 회수 시각에 노출이 멈췄으니 그때까지만 쓴 것으로 본다.
// 멤버십 청구는 부스트가 아니라 그 청구가 산 한 달(승인 시각부터 달력 한 달)을 기준으로 나눈다.
import { addMonth } from "@/lib/membership/plan";

export type RefundBoost = { startsAt: Date; endsAt: Date; revokedAt: Date | null };

/** 이 결제의 일할 기준. 멤버십 청구면 승인부터 한 달, 노출 자리면 걸린 부스트 */
export function paymentRefundBasis(p: { membershipId: string | null; approvedAt: Date | null }, boost: RefundBoost | null): RefundBoost | null {
  if (p.membershipId && p.approvedAt) return { startsAt: p.approvedAt, endsAt: addMonth(p.approvedAt), revokedAt: null };
  return boost;
}

/**
 * 남은 기간 몫. 부스트가 없으면(승인 뒤 걸기 실패) 노출을 하나도 못 받았으니 전액이다.
 * 시작 전(이어 붙여 대기 중)이어도 전액, 다 끝났으면 0.
 */
export function proratedRefund(amount: number, boost: RefundBoost | null, now: Date): number {
  if (!boost) return amount;
  const stop = boost.revokedAt && boost.revokedAt < now ? boost.revokedAt : now;
  const total = boost.endsAt.getTime() - boost.startsAt.getTime();
  if (total <= 0) return 0;
  const left = boost.endsAt.getTime() - Math.max(stop.getTime(), boost.startsAt.getTime());
  if (left <= 0) return 0;
  return Math.min(amount, Math.floor((amount * left) / total));
}
