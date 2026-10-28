// 요금 설정 — 값, 요금 카드 문구, 멤버십 혜택, 프로모션(2026-10-28). 사용자: "첫 달 할인, 첫 결제 할인 같은 프로모션을 관리자가 설정하게,
// 구독 멤버십도 문구부터 모든 설정을 관리자가".
//
// 저장은 site_settings 의 키 하나(services/settings 의 SETTING_KEYS.pricing)에 이 모양의 JSON 하나다. 표를 새로 만들지 않은 이유는
// schema-settings 머리 주석과 같다. 값이 없거나 모양이 틀리면 PRICING_DEFAULTS 로 물러난다 — 이 설정 때문에 결제 화면이 깨지면 안 된다.
//
// 관리자가 바꿀 수 없는 것: 상품의 자리(slot), 대상, 기간(7일)은 부스트 걸기와 환불 계산이 기대는 구조라 코드(lib/payments/products)에 둔다.
// 바꿀 수 있는 것: 값, 팔지 말지, 이용권 수, 카드와 멤버십 화면 문구, 프로모션.
//
// 이 파일은 "use client" 가 아니다 — 관리자 폼(클라이언트)과 서버가 같은 스키마로 검증한다(AGENTS.md 2장).
import { z } from "zod";

export const PRICED_KEYS = ["boost_indie_7d", "pin_promo_7d", "bundle_7d", "membership"] as const;
export type PricedKey = (typeof PRICED_KEYS)[number];

/** 토스 결제 최소 금액(원). 이보다 낮은 값, 할인 결과는 받지 않는다 */
export const MIN_CHARGE = 100;
/** 값 상한(원). 오타로 0 이 하나 더 붙는 일을 막는 안전판 */
const MAX_CHARGE = 10_000_000;
/** 비율 할인 상한(%). 100% 는 무료라 결제가 아니다 */
const MAX_PERCENT = 90;
/** 문구 한 칸, 줄 수 상한. 카드가 터지지 않을 만큼 */
const TEXT_MAX = 60;
const LONG_TEXT_MAX = 120;
const LINES_MAX = 8;

const won = z.number().int().min(MIN_CHARGE).max(MAX_CHARGE);
const text = z.string().trim().max(TEXT_MAX);
const longText = z.string().trim().max(LONG_TEXT_MAX);
const lines = z.array(longText.min(1)).max(LINES_MAX);
const dateOnly = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const productSchema = z.object({ amount: won, active: z.boolean() });

/**
 * 카드 문구. 줄은 "이름: 설명" 꼴이면 이름만 굵게 그린다(components/payments/plan-cards).
 * 글 안의 {saving}(묶음이 아끼는 금액), {credits}(멤버십 이용권 수), {price}(첫 단 값)는 화면이 값으로 바꾼다
 */
const tierCopySchema = z.object({
  name: text.min(1),
  eyebrow: text,
  summary: text,
  tag: text,
  now: text,
  /** 윗단 머리("스파크에 더해"). 첫 단은 비운다 */
  base: text,
  lines,
  /** 카드 아래 덧말(첫 단의 "둘 다 걸 거면 ..."). 비우면 안 그린다 */
  hint: longText,
  cta: text.min(1),
});

export const promotionSchema = z
  .object({
    id: z.string().min(1).max(40),
    active: z.boolean(),
    /** 값 옆 딱지 글(예: 첫 달 할인). 보는 사람에게 그대로 보인다 */
    label: text.min(1),
    target: z.enum(PRICED_KEYS),
    /** percent: value% 할인, price: 값을 value 원으로 */
    kind: z.enum(["percent", "price"]),
    value: z.number().int().min(1).max(MAX_CHARGE),
    /** first: 처음 결제하는 사람만(멤버십은 멤버십을, 상품은 상품을 한 번도 결제한 적 없는 사람). all: 누구나 */
    audience: z.enum(["all", "first"]),
    /** 한국 날짜. 비우면 끝없이 */
    startsOn: dateOnly.nullable(),
    endsOn: dateOnly.nullable(),
  })
  .refine((p) => p.kind !== "percent" || p.value <= MAX_PERCENT, { path: ["value"] })
  .refine((p) => p.kind !== "price" || p.value >= MIN_CHARGE, { path: ["value"] })
  .refine((p) => !p.startsOn || !p.endsOn || p.startsOn <= p.endsOn, { path: ["endsOn"] });

export type Promotion = z.infer<typeof promotionSchema>;

export const pricingSettingsSchema = z.object({
  products: z.object({ boost_indie_7d: productSchema, pin_promo_7d: productSchema, bundle_7d: productSchema }),
  membership: z.object({ amount: won, active: z.boolean(), boostCredits: z.number().int().min(0).max(10) }),
  copy: z.object({
    single: tierCopySchema,
    bundle: tierCopySchema,
    membership: tierCopySchema.extend({ benefits: lines }),
  }),
  promotions: z.array(promotionSchema).max(20),
});

export type PricingSettings = z.infer<typeof pricingSettingsSchema>;
export type TierKey = keyof PricingSettings["copy"];

/**
 * 기본값 — 설정이 비었을 때, 그리고 관리자 화면의 첫 값. 값은 2026-10-27 사용자 확정(낱개 6,900, 묶음 9,900, 멤버십 19,900),
 * 첫 달 9,900원은 2026-10-28 사용자 확정("첫 달 할인"). 이름은 같은 날 사용자 확정(스파크, 스포트라이트, 메이커)
 */
export const PRICING_DEFAULTS: PricingSettings = {
  products: {
    boost_indie_7d: { amount: 6_900, active: true },
    pin_promo_7d: { amount: 6_900, active: true },
    bundle_7d: { amount: 9_900, active: true },
  },
  membership: { amount: 19_900, active: true, boostCredits: 2 },
  copy: {
    single: {
      name: "스파크",
      eyebrow: "7일 | 노출 자리 하나",
      summary: "필요할 때 한 번 반짝",
      tag: "",
      now: "결제하면 바로 노출이 시작돼요",
      base: "",
      lines: ["자리 하나: 부스트나 홍보 글 고정", "7일: 결제하면 바로 시작"],
      hint: "둘 다 걸 거면 스포트라이트가 {saving} 싸요",
      cta: "스파크 켜기",
    },
    bundle: {
      name: "스포트라이트",
      eyebrow: "7일 | 노출 자리 둘",
      summary: "게임과 홍보 글을 함께 비춰요",
      tag: "추천",
      now: "결제하면 바로 노출이 시작돼요",
      base: "스파크에 더해",
      lines: ["자리 둘: 부스트와 홍보 글 고정", "할인: 따로 사는 것보다 {saving}"],
      hint: "",
      cta: "스포트라이트 켜기",
    },
    membership: {
      name: "메이커",
      eyebrow: "매달 | 구독",
      summary: "스포트라이트를 매달, 멤버 전용 혜택까지",
      tag: "모든 혜택",
      now: "시작하는 순간 이용권이 바로 채워져요",
      base: "스포트라이트에 더해",
      lines: ["노출 이용권: 매달 {credits}장, 스포트라이트를 매달", "통계 자세히: 30일 그래프와 유입 경로", "메이커 꼬리표: 내 이름 옆 보라 표시", "플레이테스트 고정: 모아 보기 맨 위"],
      hint: "",
      cta: "메이커 시작하기",
      benefits: [
        "매달 노출 이용권 {credits}장. 한 장이면 인디 목록 맨 위 또는 홍보 글 고정을 7일 걸 수 있어요",
        "내 게임 통계 자세히: 날짜별 그래프와 어디서 들어왔는지",
        "게시판 글과 내 인디 게임에 이름 옆 메이커 꼬리표",
        "플레이테스트 모집을 모아 보기 맨 위에 고정",
        "남은 이용권은 다음 달로 넘어가지 않아요",
        "해지해도 이번 기간이 끝날 때까지 이용권을 쓸 수 있어요",
        "결제는 등록한 카드로 매달 같은 날 자동으로 나가요",
      ],
    },
  },
  promotions: [
    { id: "maker-first-month", active: true, label: "첫 달 할인", target: "membership", kind: "price", value: 9_900, audience: "first", startsOn: null, endsOn: null },
  ],
};

/** 저장된 값을 읽는다. 모양이 틀리면 기본값 — 부분만 틀려도 통째로 물러난다(반쯤 맞는 요금표가 더 위험하다) */
export function parsePricingSettings(raw: unknown): PricingSettings {
  const parsed = pricingSettingsSchema.safeParse(raw);
  return parsed.success ? parsed.data : PRICING_DEFAULTS;
}

/** 문구 안의 {이름} 을 값으로. 모르는 이름은 그대로 둔다 */
export function fillCopy(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (whole, name: string) => vars[name] ?? whole);
}
