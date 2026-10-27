// 메이커 멤버십 요금제와 갱신 규칙(2026-10-27, 기획서 4.3: 월 19,900원, 매달 부스트 7일 2회). 화면, 서버, 크론, 검증이 같은 값을 본다.
//
// 기간은 달력 한 달이다(30일이 아니다) — 매달 같은 날에 청구돼야 사람이 "언제 나가는지" 를 외운다.
// 그달에 그날이 없으면(1월 31일 → 2월) 그달 마지막 날로 당긴다.
//
// 갱신 실패는 하루 간격으로 MAX_FAILED_ATTEMPTS 번까지 다시 청구하고, 그래도 안 되면 끝낸다. 재시도 동안 혜택은 멈춘다
// (기간이 이미 지났다) — 돈을 못 받은 달의 이용권을 먼저 내주지 않는다.

export type MembershipPlan = { name: string; amount: number; boostCredits: number };

export const MEMBERSHIP_PLANS = {
  maker_monthly: { name: "메이커 멤버십", amount: 19_900, boostCredits: 2 },
} as const satisfies Record<string, MembershipPlan>;

export type MembershipPlanKey = keyof typeof MEMBERSHIP_PLANS;
export const DEFAULT_PLAN: MembershipPlanKey = "maker_monthly";

export function isMembershipPlanKey(v: string): v is MembershipPlanKey {
  return Object.hasOwn(MEMBERSHIP_PLANS, v);
}

/** 갱신 청구를 몇 번까지 해 보나. 카드 한도, 잔액 문제는 며칠 안에 풀리는 일이 많다 */
export const MAX_FAILED_ATTEMPTS = 3;
/** 실패 뒤 다음 청구까지. 하루면 매일 도는 크론(api/cron/daily)과 맞는다 */
export const RETRY_INTERVAL_MS = 86_400_000;

/** 한 달 뒤 같은 시각. 그달에 그날이 없으면 그달 마지막 날 */
export function addMonth(d: Date): Date {
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth() + 1;
  const lastDay = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  return new Date(Date.UTC(y, m, Math.min(d.getUTCDate(), lastDay), d.getUTCHours(), d.getUTCMinutes(), d.getUTCSeconds(), d.getUTCMilliseconds()));
}

export type RenewalStatus = "active" | "canceling" | "past_due" | "ended";

/** 크론이 이 멤버십에 할 일. charge: 다음 달 청구, end: 끝내기, none: 아직 */
export function renewalAction(m: { status: RenewalStatus; currentPeriodEnd: Date; nextChargeAt: Date | null }, now: Date): "charge" | "end" | "none" {
  if (m.status === "canceling") return m.currentPeriodEnd <= now ? "end" : "none";
  if (m.status === "active" || m.status === "past_due") return m.nextChargeAt && m.nextChargeAt <= now ? "charge" : "none";
  return "none";
}

/** 갱신 청구 실패 뒤 상태. 마지막 시도였으면 끝, 아니면 하루 뒤 다시 */
export function afterFailedCharge(prevAttempts: number, now: Date): { status: "past_due" | "ended"; failedAttempts: number; nextChargeAt: Date | null } {
  const failedAttempts = prevAttempts + 1;
  if (failedAttempts >= MAX_FAILED_ATTEMPTS) return { status: "ended", failedAttempts, nextChargeAt: null };
  return { status: "past_due", failedAttempts, nextChargeAt: new Date(now.getTime() + RETRY_INTERVAL_MS) };
}

/**
 * 청구가 성공한 뒤 새 기간의 시작. 제때 갱신이면 지난 기간 끝에서 바로 잇고(크론이 몇 시간 늦어도 날짜가 밀리지 않게),
 * 처음 시작이거나 실패 뒤 늦게 성공했으면 지금부터 — 혜택이 멈췄던 날을 돈 내고 산 것으로 치지 않는다
 */
export function nextPeriodStart(m: { status: RenewalStatus; currentPeriodEnd: Date } | null, now: Date): Date {
  if (m && m.status === "active" && m.currentPeriodEnd <= now) return m.currentPeriodEnd;
  return now;
}

/** 혜택을 받는 상태. 해지 예약 중이어도 기간 끝까지는 쓴다. 목록 질의(services/membership 의 makerActiveSql)도 이 목록을 본다 */
export const BENEFIT_STATUSES = ["active", "canceling"] as const satisfies readonly RenewalStatus[];

/** 이용권을 쓸 수 있나 — 돈을 낸 기간 안이고 혜택 상태 */
export function canUseBenefits(m: { status: RenewalStatus; currentPeriodEnd: Date }, now: Date): boolean {
  return (BENEFIT_STATUSES as readonly RenewalStatus[]).includes(m.status) && m.currentPeriodEnd > now;
}
