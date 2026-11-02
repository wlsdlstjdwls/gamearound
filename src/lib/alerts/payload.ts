// 가격 알림 한 통의 제목과 본문 — 발송(sync/dispatch-alerts)과 가격 알림 화면의 미리보기(기획서 v2.0 S-26)가 같이 쓴다.
// 한곳에 두는 이유: 미리보기가 실제로 오는 글과 다르면 미리보기가 거짓말이 된다.
import { conditionMode, type AlertCondition, type AlertPriceRow } from "@/lib/alerts/condition";
import { formatPrice } from "@/lib/currency";
import type { Currency } from "@/server/db/schema";
import { PLATFORM_LABEL } from "@/lib/format";
import { SYSTEM_TEMPLATES } from "@/lib/notify/system-templates";

export type AlertPayloadInput = { gameTitle: string; platform: string; price: number; currency: Currency; discountPct: number };

/**
 * 웹푸시, 메일, 알림함 템플릿에 넣을 값(2026-11-02, 문구는 알림템플릿관리의 템플릿). 발송과 가격 알림 화면의 미리 보기가 같은 값을 쓴다.
 * 제목, 내용은 아래 기본 글(alertPayload)이다 — 메일 템플릿(mail.price_alert)이 이 둘을 받는다
 */
export function alertVars(input: AlertPayloadInput): Record<string, string> {
  const base = alertPayload(input);
  return {
    게임: input.gameTitle,
    기종: PLATFORM_LABEL[input.platform] ?? input.platform,
    가격: formatPrice(input.price, input.currency),
    할인율: String(input.discountPct),
    제목: base.title,
    내용: base.body,
  };
}

/** 웹푸시 템플릿 코드. 할인이 붙었으면 "할인 중", 아니면 "가격이 내려갔어요" 꼴(템플릿에는 조건문이 없어 둘로 갈랐다) */
export function alertPushCode(discountPct: number): string {
  return discountPct > 0 ? SYSTEM_TEMPLATES.pushPriceSale : SYSTEM_TEMPLATES.pushPriceDrop;
}

/** 템플릿이 없을 때의 기본 글. 0100 시드가 이 글 그대로다 */
export function alertPayload({ gameTitle, platform, price, currency, discountPct }: AlertPayloadInput): { title: string; body: string } {
  return {
    title: discountPct > 0 ? `${gameTitle} 할인 중` : `${gameTitle} 가격이 내려갔어요`,
    body: `${PLATFORM_LABEL[platform] ?? platform} ${formatPrice(price, currency)}${discountPct > 0 ? ` (${discountPct}% 할인)` : ""}`,
  };
}

/**
 * 미리보기에 넣을 예시 할인율. 기본 알림은 "할인 1% 이상" 이라 그 값을 그대로 쓰면 예시가 1% 할인으로 나와 실감이 없다.
 * 국내 스토어 할인 글에서 가장 흔한 폭으로 잡았다. 알림 조건이 이보다 높으면 조건 값을 쓴다
 */
export const ALERT_PREVIEW_SAMPLE_PCT = 20;

/** 예시 값 반올림 단위(원). 스토어 가격은 대개 백 원 단위로 끝난다 */
const PREVIEW_ROUND_UNIT = 100;

/**
 * 미리보기에 쓸 값. 지금 조건에 맞으면 실제 값 그대로, 아니면 조건이 맞는 순간을 가정한 예시다 —
 * 목표가 알림이면 목표가, 할인율 알림이면 지금 값에서 그 할인율만큼 깎은 값. 값을 모르는 게임이면 null(미리보기를 안 세운다).
 */
export function alertPreviewInput(gameTitle: string, c: AlertCondition, best: AlertPriceRow | null, met: boolean): AlertPayloadInput | null {
  if (!best || best.currentPrice === null) return null;
  const base = { gameTitle, platform: best.platform, currency: best.currency };
  if (met) return { ...base, price: best.currentPrice, discountPct: best.discountPct ?? 0 };
  if (conditionMode(c) === "price" && c.targetPrice !== null) return { ...base, price: c.targetPrice, discountPct: 0 };
  const pct = Math.max(c.minDiscountPct ?? 1, ALERT_PREVIEW_SAMPLE_PCT);
  const price = Math.round((best.currentPrice * (100 - pct)) / 100 / PREVIEW_ROUND_UNIT) * PREVIEW_ROUND_UNIT;
  return { ...base, price, discountPct: pct };
}
