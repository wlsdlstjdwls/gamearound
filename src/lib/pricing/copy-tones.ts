// 요금 카드와 프로모션 배지의 색 고르기(2026-10-30, 사용자 "카드 문구나 프로모션 색상도 바꿀 수 있으면").
//
// 값은 둘 중 하나다: 서비스 색 토큰 이름(acc, plum ...) 또는 관리자가 직접 고른 "#rrggbb".
// 토큰을 먼저 보이는 이유: 토큰은 테마마다 값이 따로 서서 다크 모드에서도 글자가 읽힌다. 직접 고른 색은 그런 보정이 없다 —
// 그래서 직접 고른 배지는 글자색을 바탕 밝기로 정하고(readableOn), 띠는 그 색을 옅게 섞어 깐다(components/payments/copy-tone).
// 처음엔 토큰만 받았는데 사용자가 "커스텀도 가능하게, 스포이트도" 라고 해서 #hex 를 열었다(같은 날).
// 노란 계열(warn)은 토큰 보기에서 뺐다 — "누런색 금지"(2026-10-27 사용자). 초록(ok)도 뺐다 — 요금 카드에서 초록은 "이용 중" 상태 딱지 자리다.
//
// 자리마다 보기 토큰이 다르다: 배지는 Tag 의 tone 이름 그대로, 즉시혜택 띠는 옅은 면, 업셀 안내는 글자색만.
// 값이 없으면(앞 판 저장값) DEFAULT_TONES 로 그린다 — 색을 고르기 전과 화면이 같다.
// 이 파일은 "use client" 가 아니다 — 스키마(settings)와 화면이 같이 읽는다. 클래스 이름은 components/payments/copy-tone 에 둔다.
import { z } from "zod";

/** 배지(강조 배지, 프로모션 노출명 배지) — ui/tag 의 TagTone 중 요금 카드에 어울리는 것 */
export const BADGE_TONES = ["acc", "plum", "plumSolid", "hot", "neutral"] as const;
export type BadgeTone = (typeof BADGE_TONES)[number];

/** 가격 아래 즉시혜택 띠 — 옅은 면 + 같은 계열 글자 */
export const BOX_TONES = ["acc", "plum", "danger", "neutral"] as const;
export type BoxTone = (typeof BOX_TONES)[number];

/** 버튼 위 업셀 안내 — 글자색만 */
export const TEXT_TONES = ["danger", "acc", "plum", "mut"] as const;
export type TextTone = (typeof TEXT_TONES)[number];

/** 직접 고른 색. 소문자 여섯 자리로 저장한다(색상 선택기, 스포이트가 주는 꼴) */
export type HexColor = `#${string}`;
const HEX = /^#[0-9a-f]{6}$/;

export function isHexColor(v: string | null | undefined): v is HexColor {
  return typeof v === "string" && HEX.test(v);
}

/** 토큰 이름 또는 #rrggbb. 스키마가 둘 다 받는다 */
export function toneSchema<T extends readonly [string, ...string[]]>(tones: T) {
  // z.custom 으로 둬 추론 타입이 그냥 string 이 아니라 HexColor 가 되게 한다 — 화면이 토큰 이름과 #hex 를 타입으로 가른다
  return z.union([z.enum(tones), z.custom<HexColor>((v) => typeof v === "string" && HEX.test(v))]);
}

export type ToneValue<T extends string> = T | HexColor;

/**
 * 직접 고른 바탕 위에 읽히는 글자색. 상대 휘도(WCAG)로 가른다 — 밝은 바탕엔 진한 글자, 어두운 바탕엔 흰 글자.
 * 0.4 를 기준으로 둔 이유: 서비스 파랑(#2563eb, 0.2)에 흰 글자, 연한 노랑(#fde68a, 0.8)에 진한 글자가 서는 자리다
 */
export function readableOn(hex: HexColor): "light" | "dark" {
  const ch = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  const lum = 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
  return lum > 0.4 ? "dark" : "light";
}

/** 고르기 전 화면의 색(2026-10-28 사용자가 본 카드 그대로). 멤버십 배지만 채운 보라 — 한 화면에 하나뿐인 강조다(plan-cards 머리 주석) */
export const DEFAULT_TONES = {
  tag: { single: "acc", bundle: "acc", membership: "plumSolid" },
  now: "acc",
  hint: "danger",
  promo: "plum",
} as const satisfies {
  tag: Record<"single" | "bundle" | "membership", BadgeTone>;
  now: BoxTone;
  hint: TextTone;
  promo: BadgeTone;
};
