// 요금 설정 — 값, 요금 카드 문구, 멤버십 혜택, 프로모션(2026-10-28). 사용자: "첫 달 할인, 첫 결제 할인 같은 프로모션을 관리자가 설정하게,
// 구독 멤버십도 문구부터 모든 설정을 관리자가".
//
// 저장은 site_settings 의 키 하나(services/settings 의 SETTING_KEYS.pricing)에 이 모양의 JSON 하나다. 표를 새로 만들지 않은 이유는
// schema-settings 머리 주석과 같다. 값이 없거나 모양이 틀리면 PRICING_DEFAULTS 로 물러난다 — 이 설정 때문에 결제 화면이 깨지면 안 된다.
//
// 2026-10-29 저녁(사용자 "자유롭게 내가 상품을 추가하고 삭제하고 이런 게 가능해야지"): 광고 상품은 관리자가 만드는 목록이다.
// 상품 하나는 이름, 자리(인디 목록 맨 위, 홍보 글 고정, 둘 다), 기간(일), 값, 판매 여부다. 앞에는 상품 셋이 코드 표(lib/payments/products)에 박혀
// 값과 판매 여부만 바꿀 수 있었다. 자리 자체(어디에 어떻게 보이나)는 화면 코드라 여전히 둘뿐이다 — 새 자리는 개발이 붙인다.
// 앞 모양(products 가 열쇠 셋짜리 객체)으로 저장된 값은 읽을 때 목록으로 옮긴다(legacyProducts). 옮기지 않으면 통째로 기본값으로 물러난다.
// 상품 id 는 결제 줄(payments.product)에 남는다 — 지운 상품의 지난 결제도 이름 없이 읽힐 뿐 깨지지 않는다(services/payments/history).
//
// 이 파일은 "use client" 가 아니다 — 관리자 폼(클라이언트)과 서버가 같은 스키마로 검증한다(AGENTS.md 2장).
import { z } from "zod";
import { BADGE_TONES, BOX_TONES, TEXT_TONES } from "@/lib/pricing/copy-tones";

/** 광고 자리. 화면 코드(promotions)가 아는 자리가 이 둘뿐이라 상품은 이 안에서만 고른다. 값은 schema 의 promo_slot 과 같다 */
export const AD_SLOTS = ["indie_top", "promo_pin"] as const;
export type AdSlot = (typeof AD_SLOTS)[number];

/** 멤버십 열쇠. 광고 상품 id 와 같은 자리(프로모션 대상, 값 매기기)에 선다 */
export const MEMBERSHIP_KEY = "membership";
/** 값을 매기는 대상 — 광고 상품 id 이거나 멤버십 */
export type PricedKey = string;

/** 상품 수 상한. 구매 화면이 고르기 칸으로 늘어놓을 수 있을 만큼 */
export const MAX_PRODUCTS = 20;
/** 기간 상한(일). 오타로 0 이 붙은 3650일 광고를 막는다 */
export const MAX_PRODUCT_DAYS = 90;
/** 상품 id 꼴. 주문 번호 앞머리(makeOrderId)와 결제 줄에 그대로 들어간다 */
const PRODUCT_ID = /^[A-Za-z0-9_-]{1,40}$/;

/** 토스 결제 최소 금액(원). 이보다 낮은 값, 할인 결과는 받지 않는다 */
export const MIN_CHARGE = 100;
/** 값 상한(원). 오타로 0 이 하나 더 붙는 일을 막는 안전판 */
export const MAX_CHARGE = 10_000_000;
/** 비율 할인 상한(%). 100% 는 무료라 결제가 아니다 */
export const MAX_PERCENT = 90;
/** 문구 한 칸, 줄 수 상한. 카드가 터지지 않을 만큼 */
const TEXT_MAX = 60;
const LONG_TEXT_MAX = 120;
const LINES_MAX = 8;

const won = z.number().int().min(MIN_CHARGE).max(MAX_CHARGE);
const text = z.string().trim().max(TEXT_MAX);
const longText = z.string().trim().max(LONG_TEXT_MAX);
const lines = z.array(longText.min(1)).max(LINES_MAX);
const dateOnly = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const catalogProductSchema = z.object({
  id: z.string().regex(PRODUCT_ID),
  /** 구매 화면 고르기 칸과 영수증, 결제 내역에 그대로 보이는 이름 */
  name: text.min(1),
  /** 둘이면 묶음 — 인디 게임과 홍보 글을 하나씩 골라 같이 건다 */
  slots: z
    .array(z.enum(AD_SLOTS))
    .min(1)
    .max(AD_SLOTS.length)
    .refine((xs) => new Set(xs).size === xs.length),
  days: z.number().int().min(1).max(MAX_PRODUCT_DAYS),
  amount: won,
  active: z.boolean(),
  /**
   * 묶음의 구성 상품 — 자리마다 낱개 상품 하나(2026-10-31, 사용자 "묶음이면 어떤 상품을 고를지 선택 가능해야"). 묶음의 그을 값(낱개 합)이 이 상품들의 값이다.
   * 앞 판 저장값에는 없어 읽기에서는 비워 둘 수 있다 — 비면 같은 기간 낱개를 대신 쓴다(quote 의 bundleListPrice). 저장 검사는 묶음에 자리마다 하나를 요구한다(admin-validation)
   */
  parts: z.array(z.string().regex(PRODUCT_ID)).max(AD_SLOTS.length).optional(),
});
export type CatalogProduct = z.infer<typeof catalogProductSchema>;

/** 앞 모양(열쇠 셋짜리 객체)의 상품 셋. 저장된 값을 옮길 때와 기본값이 같이 쓴다 */
const LEGACY_PRODUCTS: ReadonlyArray<Omit<CatalogProduct, "amount" | "active">> = [
  { id: "boost_indie_7d", name: "인디 게임 부스트 7일", slots: ["indie_top"], days: 7 },
  { id: "pin_promo_7d", name: "홍보 글 고정 7일", slots: ["promo_pin"], days: 7 },
  { id: "bundle_7d", name: "인디 게임 부스트 + 홍보 글 고정 7일", slots: ["indie_top", "promo_pin"], days: 7 },
];

/** products 가 앞 모양이면 목록으로 옮긴다. 이미 목록이거나 모르는 모양이면 손대지 않는다(스키마가 가린다) */
function legacyProducts(raw: unknown): unknown {
  if (Array.isArray(raw) || !raw || typeof raw !== "object") return raw;
  const old = raw as Record<string, { amount?: unknown; active?: unknown } | undefined>;
  return LEGACY_PRODUCTS.filter((p) => old[p.id]).map((p) => ({ ...p, slots: [...p.slots], amount: old[p.id]?.amount, active: old[p.id]?.active }));
}

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
  /** 색(lib/pricing/copy-tones). 앞 판 저장값에는 없다 — 비면 DEFAULT_TONES 로 그린다 */
  tagTone: z.enum(BADGE_TONES).optional(),
  nowTone: z.enum(BOX_TONES).optional(),
  hintTone: z.enum(TEXT_TONES).optional(),
});

/** 사람이 고르는 중단 사유. 늘릴 때 여기와 admin-messages 의 stopReasonLabels 만 고친다 */
export const PROMOTION_STOP_REASONS = ["manual", "price_change"] as const;

export const promotionSchema = z
  .object({
    id: z.string().min(1).max(40),
    active: z.boolean(),
    /** 손으로 멈춘 까닭(active 가 false 일 때). 앞 판 저장값에는 없어 비워 둘 수 있다 — 비면 운영 중단으로 읽는다(2026-10-30 진행상태를 진행 중, 중단 둘로) */
    stopReason: z.enum(PROMOTION_STOP_REASONS).nullable().optional(),
    /** 관리자용 코드명(2026-10-30 사용자 "코드 + 코드명, 고객노출명은 따로"). 앞 판 저장값에는 없어 비면 고객노출명으로 읽는다 */
    name: text.min(1).optional(),
    /** 값 옆 딱지 글(예: 첫 달 할인). 보는 사람에게 그대로 보인다 */
    label: text.min(1),
    /** 노출명 배지 색(lib/pricing/copy-tones). 비면 DEFAULT_TONES.promo */
    tone: z.enum(BADGE_TONES).optional(),
    /** 광고 상품 id 이거나 membership. 있는 상품인지는 설정 전체 스키마가 본다 */
    target: z.string().min(1).max(40),
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

export const pricingSettingsSchema = z
  .object({
  products: z.preprocess(
    legacyProducts,
    z
      .array(catalogProductSchema)
      .max(MAX_PRODUCTS)
      .refine((ps) => new Set(ps.map((p) => p.id)).size === ps.length),
  ),
  membership: z.object({ amount: won, active: z.boolean(), boostCredits: z.number().int().min(0).max(10) }),
  copy: z.object({
    single: tierCopySchema,
    bundle: tierCopySchema,
    membership: tierCopySchema.extend({ benefits: lines }),
  }),
  promotions: z.array(promotionSchema).max(20),
})
  // 지운 상품을 겨눈 프로모션은 받지 않는다 — 걸 데가 없는 할인이 목록에 남으면 켜져 있어도 아무 일이 없다
  .refine((s) => s.promotions.every((p) => p.target === MEMBERSHIP_KEY || s.products.some((x) => x.id === p.target)), { path: ["promotions"] });

export type PricingSettings = z.infer<typeof pricingSettingsSchema>;
export type TierKey = keyof PricingSettings["copy"];

/**
 * 기본값 — 설정이 비었을 때, 그리고 관리자 화면의 첫 값. 값은 2026-10-27 사용자 확정(낱개 6,900, 묶음 9,900, 멤버십 19,900),
 * 첫 달 9,900원은 2026-10-28 사용자 확정("첫 달 할인"). 이름은 같은 날 사용자 확정(스파크, 스포트라이트, 메이커)
 */
export const PRICING_DEFAULTS: PricingSettings = {
  products: [
    { ...LEGACY_PRODUCTS[0], slots: ["indie_top"], amount: 6_900, active: true },
    { ...LEGACY_PRODUCTS[1], slots: ["promo_pin"], amount: 6_900, active: true },
    { ...LEGACY_PRODUCTS[2], slots: ["indie_top", "promo_pin"], amount: 9_900, active: true, parts: [LEGACY_PRODUCTS[0].id, LEGACY_PRODUCTS[1].id] },
  ],
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
      name: "메이커 멤버십",
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

/** 상품 하나. 지웠거나 모르는 id 면 null */
export function findProduct(s: PricingSettings, id: string): CatalogProduct | null {
  return s.products.find((p) => p.id === id) ?? null;
}

export function isBundleProduct(p: Pick<CatalogProduct, "slots">): boolean {
  return p.slots.length > 1;
}
