// 브랜드 심볼(게임패드)의 기하 정보와 아이콘 전용 색 보정값.
// 심볼은 화면 컴포넌트(components/ui/logo.tsx), 파비콘/앱 아이콘(app/icon.tsx, apple-icon.tsx),
// SNS 이미지(opengraph-image.tsx), 정적 PNG 생성 스크립트 네 곳에서 쓰인다.
// path 문자열이 네 벌로 흩어지면 실루엣을 고칠 때 반드시 한 곳이 남으므로 여기서만 정의한다.
//
// 실루엣 규칙(왜 이 좌표인지):
//  - 32 그리드. 16px 로 줄였을 때 좌표가 짝수 픽셀에 떨어진다.
//  - 디테일은 y=15 에 정렬한다. 광학 중심이 기하 중심(16)보다 1px 위여야 아이콘이 가라앉아 보이지 않는다.
//  - 그립은 바깥으로만 벌어지고 아래로 늘어지지 않는다. 늘어뜨리면 안드로이드 원형 마스크에서 잘린다.
//  - 가운데 노치 깊이는 2.5 까지. 더 파면 16px 에서 바디가 두 조각으로 갈라져 보인다.
//
// OG 이미지와 아이콘은 CSS 바깥(satori, 정적 PNG)에서 그려지므로 globals.css 토큰을 참조할 수 없다.
// 그래서 BRAND_COLOR 가 토큰 값을 손으로 옮겨 들고 있다 — 토큰을 고치면 이쪽도 같이 고친다.
//
// 방향키와 버튼은 배경색으로 덧칠하지 않고 evenodd 로 실제로 뚫는다.
// 덧칠하면 헤더(--surface, 흰색)와 페이지(--bg, 오프화이트) 위에서 구멍 색이 어긋난다.

import { SITE } from "@/lib/site";

/** 심볼 좌표계 한 변 */
export const BRAND_VIEWBOX = 32;

/** 게임패드 바디 외곽. 모든 변형이 이 실루엣을 공유한다 */
const BODY =
  "M11.6 7.4h8.8c5.4 0 8.9 3.5 9.7 9.1l.6 4.2c.5 3.4-1.3 5.9-4.2 5.9-2.2 0-3.5-1.2-4.6-3.1l-1.6-2.8c-.5-.9-1.1-1.3-2.1-1.3h-4.4c-1 0-1.6.4-2.1 1.3l-1.6 2.8c-1.1 1.9-2.4 3.1-4.6 3.1-2.9 0-4.7-2.5-4.2-5.9l.6-4.2c.8-5.6 4.3-9.1 9.7-9.1z";

/** 왼쪽 방향키 */
const DPAD = "M8.6 11.2h2.4v2.6h2.6v2.4h-2.6v2.6H8.6v-2.6H6v-2.4h2.6z";

type Dot = { cx: number; cy: number; r: number };

/**
 * 오른쪽 버튼 4개 중 위쪽 하나만 악센트다 —
 * "여러 스토어 중 지금 최저가인 한 곳"이라는 서비스의 서사를 아이콘이 계속 반복한다.
 */
const BUTTON_ACCENT: Dot = { cx: 22.4, cy: 12.2, r: 1.5 };
const BUTTONS: readonly Dot[] = [
  { cx: 19.6, cy: 15, r: 1.5 },
  { cx: 25.2, cy: 15, r: 1.5 },
  { cx: 22.4, cy: 17.8, r: 1.5 },
];

/**
 * 16px 전용 축약형. 방향키와 버튼 4개는 16px 에서 한 덩어리로 뭉치므로
 * 그 크기에서는 점 두 개만 남긴 변형을 쓴다(왼쪽 구멍, 오른쪽 악센트).
 */
const MINI_HOLE: Dot = { cx: 9.8, cy: 15, r: 2.4 };
const MINI_ACCENT: Dot = { cx: 22.2, cy: 15, r: 2.4 };

/** 원을 path 로. 바디와 한 path 에 합쳐야 evenodd 로 구멍이 뚫린다 */
function dotPath({ cx, cy, r }: Dot): string {
  return `M${cx - r} ${cy}a${r} ${r} 0 1 0 ${r * 2} 0a${r} ${r} 0 1 0 ${-r * 2} 0z`;
}

export type BrandSymbolVariant = "full" | "mini";

/** 바디 + 뚫린 디테일을 합친 단일 path. fill-rule="evenodd" 로 그려야 한다 */
export function brandBodyPath(variant: BrandSymbolVariant = "full"): string {
  const holes =
    variant === "full"
      ? [DPAD, dotPath(BUTTON_ACCENT), ...BUTTONS.map(dotPath)]
      : [dotPath(MINI_HOLE), dotPath(MINI_ACCENT)];
  return [BODY, ...holes].join("");
}

/** 구멍 위에 덮어 그리는 악센트 버튼 */
export function brandAccentDot(variant: BrandSymbolVariant = "full"): Dot {
  return variant === "full" ? BUTTON_ACCENT : MINI_ACCENT;
}

/**
 * 아이콘 색. ink / bg / accent 는 SITE 가 원천이고, 나머지 둘은 그 자리에서만 필요한 보정값이다.
 * globals.css 의 --acc 를 그대로 쓰면 두 경우에 사실상 안 보인다:
 *  - 잉크 배경 위(앱 아이콘, 반전 락업): 명도 차가 부족해 검정에 묻힌다(2.24:1).
 *  - 16px 파비콘: 점이 작아 어두운 보라가 검정으로 읽힌다.
 */
export const BRAND_COLOR = {
  ink: SITE.themeColor,
  bg: SITE.backgroundColor,
  accent: SITE.accentColor,
  /** 잉크 배경 위에 얹는 악센트. globals.css 의 --acc-on-ink 와 같은 값 */
  accentOnInk: "#9182f0",
  /** 16px 이하에서만 쓰는 명도 보정 악센트 — 점이 작아 어두운 보라는 검정으로 읽힌다 */
  accentMicro: "#6a3fd6",
  /** 카드, 칩 바탕. globals.css 의 --surface 와 같은 값 */
  surface: "#ffffff",
  /** 테두리. globals.css 의 --line 과 같은 값 */
  line: "#e6e3dd",
  /** 보조 텍스트. globals.css 의 --mut 과 같은 값 */
  muted: "#5c5a55",
  /** 취소선 가격 같은 흐린 텍스트. globals.css 의 --dim-2 와 같은 값 */
  faint: "#a8a59e",
} as const;

/** 안드로이드 maskable 안전영역 — 바깥 10%는 잘려나간다고 보고 심볼을 그 안에 넣는다 */
export const MASKABLE_SAFE_RATIO = 0.8;

type SvgOptions = {
  variant?: BrandSymbolVariant;
  /** 바디 색 */
  body?: string;
  /** 악센트 버튼 색 */
  accent?: string;
  /** 깔아줄 배경색. 없으면 투명(구멍으로 바탕이 비친다) */
  background?: string;
  /** 배경 대비 심볼이 차지하는 비율. maskable 안전영역을 맞출 때 쓴다 */
  inset?: number;
  size?: number;
};

/**
 * 심볼을 SVG 문자열로 만든다.
 * ImageResponse(satori)는 SVG 자식 요소를 직접 그리지 못하고 data URI 이미지만 받으므로,
 * 아이콘/OG 생성 쪽은 React 컴포넌트가 아니라 이 문자열을 쓴다.
 */
export function brandSymbolSvg(options: SvgOptions = {}): string {
  const {
    variant = "full",
    body = BRAND_COLOR.ink,
    accent = BRAND_COLOR.accent,
    background,
    inset = 1,
    size = BRAND_VIEWBOX,
  } = options;

  const dot = brandAccentDot(variant);
  const scaled = BRAND_VIEWBOX / inset;
  const offset = (scaled - BRAND_VIEWBOX) / 2;
  const viewBox = `${-offset} ${-offset} ${scaled} ${scaled}`;

  const layers = [
    background ? `<rect x="${-offset}" y="${-offset}" width="${scaled}" height="${scaled}" fill="${background}"/>` : "",
    `<path d="${brandBodyPath(variant)}" fill="${body}" fill-rule="evenodd"/>`,
    `<circle cx="${dot.cx}" cy="${dot.cy}" r="${dot.r}" fill="${accent}"/>`,
  ].join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="${viewBox}">${layers}</svg>`;
}

/** satori 의 img src 로 넘길 data URI */
export function brandSymbolDataUri(options: SvgOptions = {}): string {
  return `data:image/svg+xml;utf8,${encodeURIComponent(brandSymbolSvg(options))}`;
}
