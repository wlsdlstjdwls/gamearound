// 요금 카드 색 고르기(lib/pricing/copy-tones)를 화면에 그리는 자리. 값은 토큰 이름이거나 관리자가 직접 고른 #rrggbb 다.
// 토큰은 클래스로(테마마다 값이 바뀐다), 직접 고른 색은 인라인 style 로 그린다 — 클래스 이름을 조립하면 Tailwind 가 만들지 않는다.
// 클래스 문자열을 통째로 적는 이유도 같다(`bg-${tone}-soft` 는 생기지 않는다).
// "use client" 가 아니다 — 서버 화면(요금 페이지)과 관리자 미리 보기가 같이 읽는다(AGENTS 6장 푸터 사고).
import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Tag, tagClass } from "@/components/ui/tag";
import { isHexColor, readableOn, type BadgeTone, type BoxTone, type TextTone, type ToneValue } from "@/lib/pricing/copy-tones";

type Painted = { className: string; style?: CSSProperties };

const BOX_TONE_CLASS: Record<BoxTone, string> = {
  acc: "bg-acc-soft text-acc",
  plum: "bg-plum-soft text-plum",
  danger: "bg-danger-soft text-danger",
  neutral: "bg-surface-2 text-ink-2",
};

const TEXT_TONE_CLASS: Record<TextTone, string> = {
  danger: "text-danger",
  acc: "text-acc",
  plum: "text-plum",
  mut: "text-mut",
};

/**
 * 직접 고른 바탕 위 글자. 흰색, 진한 잉크를 고정값으로 둔다 — 테마 토큰(--on-ink)은 다크 모드에서 어두운 색으로 뒤집혀
 * 관리자가 고른 진한 바탕 위에서 글자가 사라졌다. 바탕이 테마와 상관없는 색이니 글자도 테마와 상관없어야 한다
 */
const ON_LIGHT_HEX = "#131923";
const ON_DARK_HEX = "#ffffff";
/** 직접 고른 띠는 그 색을 바탕에 이만큼만 섞는다 — 토큰 띠(-soft)와 같은 옅기 */
const BOX_MIX = "14%";

export function ToneBadge({ tone, children }: { tone: ToneValue<BadgeTone>; children: ReactNode }) {
  if (!isHexColor(tone)) return <Tag tone={tone}>{children}</Tag>;
  return (
    <span className={tagClass()} style={{ background: tone, color: readableOn(tone) === "dark" ? ON_LIGHT_HEX : ON_DARK_HEX }}>
      {children}
    </span>
  );
}

export function boxTone(tone: ToneValue<BoxTone>, className?: string): Painted {
  if (!isHexColor(tone)) return { className: cn(BOX_TONE_CLASS[tone], className) };
  return { className: className ?? "", style: { background: `color-mix(in oklab, ${tone} ${BOX_MIX}, var(--surface))`, color: tone } };
}

export function textTone(tone: ToneValue<TextTone>, className?: string): Painted {
  if (!isHexColor(tone)) return { className: cn(TEXT_TONE_CLASS[tone], className) };
  return { className: className ?? "", style: { color: tone } };
}

/**
 * 색 고르기 동그라미(관리자 pricing-form/color-picker). 글자 없이 색만 보인다(2026-10-30 사용자 "글자가 아니라 색상으로").
 * 옅은 면 토큰(배지 acc, 띠)은 면 + 테두리로, 채운 토큰은 꽉 채워 그린다 — 같은 보라라도 옅은 배지와 채운 배지가 갈린다
 */
const DOT: Record<"badge" | "box" | "text", Record<string, string>> = {
  badge: {
    acc: "bg-acc-soft ring-2 ring-inset ring-acc",
    plum: "bg-plum-soft ring-2 ring-inset ring-plum",
    plumSolid: "bg-plum",
    hot: "bg-danger",
    neutral: "bg-surface-2 ring-2 ring-inset ring-line-strong",
  },
  box: {
    acc: "bg-acc-soft ring-2 ring-inset ring-acc",
    plum: "bg-plum-soft ring-2 ring-inset ring-plum",
    danger: "bg-danger-soft ring-2 ring-inset ring-danger",
    neutral: "bg-surface-2 ring-2 ring-inset ring-line-strong",
  },
  text: {
    danger: "bg-danger",
    acc: "bg-acc",
    plum: "bg-plum",
    mut: "bg-mut",
  },
};

export function toneDot(kind: "badge" | "box" | "text", tone: string): Painted {
  if (isHexColor(tone)) return { className: "", style: { background: tone } };
  return { className: DOT[kind][tone] ?? "" };
}
