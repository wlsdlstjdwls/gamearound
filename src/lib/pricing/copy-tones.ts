// 요금 카드와 프로모션 배지의 색 고르기(2026-10-30, 사용자 "카드 문구나 프로모션 색상도 바꿀 수 있으면").
//
// 임의 색(#hex)을 받지 않고 서비스 색 토큰 안에서 고르게 한다. 이유 둘:
//   1. 다크 모드 — 토큰은 테마마다 값이 따로 서지만, 관리자가 고른 hex 는 어두운 바탕에서 글자가 묻힌다.
//   2. 규약 — 색은 globals.css 토큰만 쓴다(AGENTS 6장). 토큰 하나를 고치면 카드 색도 같이 따라간다.
// 노란 계열(warn)은 뺐다 — "누런색 금지"(2026-10-27 사용자). 초록(ok)도 뺐다 — 요금 카드에서 초록은 "이용 중" 상태 딱지 자리다.
//
// 자리마다 고를 수 있는 색이 다르다: 배지는 Tag 의 tone 이름 그대로, 즉시혜택 띠는 옅은 면, 업셀 안내는 글자색만.
// 값이 없으면(앞 판 저장값) DEFAULT_TONES 로 그린다 — 색을 고르기 전과 화면이 같다.
// 이 파일은 "use client" 가 아니다 — 스키마(settings)와 화면이 같이 읽는다. 클래스 이름은 components/payments/copy-tone 에 둔다.

/** 배지(강조 배지, 프로모션 노출명 배지) — ui/tag 의 TagTone 중 요금 카드에 어울리는 것 */
export const BADGE_TONES = ["acc", "plum", "plumSolid", "hot", "neutral"] as const;
export type BadgeTone = (typeof BADGE_TONES)[number];

/** 가격 아래 즉시혜택 띠 — 옅은 면 + 같은 계열 글자 */
export const BOX_TONES = ["acc", "plum", "danger", "neutral"] as const;
export type BoxTone = (typeof BOX_TONES)[number];

/** 버튼 위 업셀 안내 — 글자색만 */
export const TEXT_TONES = ["danger", "acc", "plum", "mut"] as const;
export type TextTone = (typeof TEXT_TONES)[number];

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
