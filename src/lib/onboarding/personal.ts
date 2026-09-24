// 받은 취향을 "홈 취향 할인 줄" 과 "가격 알림 기본값" 으로 옮기는 자리 — 순수 함수다. DB, 네트워크를 모른다.
//
// 설계 §9 의 4회차. 온보딩이 받아 둔 할인 성향과 플랫폼이 여기서 처음 화면을 바꾼다.
// 환산은 constants 의 DEAL_STYLE_THRESHOLD 한 표만 본다 — 줄과 알림이 성향을 따로 해석하면
// "반값만 산다고 했는데 20% 할인이 추천에 뜬다" 가 생긴다.
import type { DealStyle, Platform } from "@/server/db/schema";
import { DEAL_STYLE_THRESHOLD } from "./constants";

/** 할인 줄의 조건. historicLow 면 할인율 대신 "가격 이력 최저와 같거나 낮다" 로 거른다 */
export type DealFloor = { minDiscountPct: number; historicLow: boolean };

/**
 * 성향을 할인 줄 조건으로. 답을 안 했으면 아무 할인이나(1% 이상) 보여 준다 —
 * 줄 자체가 할인 중인 게임만 모으므로 0% 는 의미가 없다.
 * "기다리지 않아요"(0%) 도 같은 자리다: 정가에 사는 사람에게도 지금 깎인 것은 보여 줄 만하다.
 */
export function dealFloor(style: DealStyle | null): DealFloor {
  if (!style) return { minDiscountPct: 1, historicLow: false };
  const pct = DEAL_STYLE_THRESHOLD[style];
  if (pct === null) return { minDiscountPct: 1, historicLow: true };
  return { minDiscountPct: Math.max(1, pct), historicLow: false };
}

/**
 * 역대 최저가 성향이 알림 슬라이더에 넣을 값. 알림은 할인율 하나로만 조건을 거는데
 * 역대 최저가는 할인율이 아니다 — 가장 가까운 "깊게 기다리는" 값을 쓴다(wait_deep 과 같다).
 */
const HISTORIC_LOW_ALERT_PCT = DEAL_STYLE_THRESHOLD.wait_deep ?? 50;

/** 가격 알림 폼의 첫 값. null 은 "취향이 없으니 폼의 기본값을 쓴다" */
export type AlertDefaults = { minDiscountPct: number | null; platform: Platform | null };

/**
 * 성향과 플랫폼에서 알림 폼의 첫 값을 고른다.
 * 플랫폼은 **하나만 골랐을 때만** 미리 고른다 — 여럿이면 어느 것으로 알림을 걸지 우리가 모른다.
 * 슬라이더 하한이 1% 라(alert-form) 정가 성향(0%)도 1 로 올린다.
 */
export function alertDefaults(input: { dealStyle: DealStyle | null; platforms: readonly Platform[] | null }): AlertDefaults {
  const platform = input.platforms?.length === 1 ? input.platforms[0] : null;
  if (!input.dealStyle) return { minDiscountPct: null, platform };
  const pct = DEAL_STYLE_THRESHOLD[input.dealStyle];
  return { minDiscountPct: Math.max(1, pct ?? HISTORIC_LOW_ALERT_PCT), platform };
}
