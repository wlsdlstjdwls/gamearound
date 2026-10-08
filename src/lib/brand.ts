// 브랜드 심볼(도트 손전등)의 격자와 아이콘 전용 색.
// 심볼은 화면 컴포넌트(components/ui/logo.tsx), 파비콘/앱 아이콘(app/icon.tsx, apple-icon.tsx),
// SNS 이미지(opengraph-image.tsx), 정적 PNG 생성 스크립트 네 곳에서 쓰인다.
// 격자가 네 벌로 흩어지면 그림을 고칠 때 반드시 한 곳이 남으므로 여기서만 정의한다.
//
// 왜 손전등인가(2026-10-08 사용자 선택): 이 서비스의 첫 이름이 "손전등"이었다(docs/손전등_개발설계서.md).
// 여러 스토어 가격판을 비춰 제일 싼 곳을 찾는다는 일을 그대로 그린다. 컨트롤러는 게임 사이트마다 있어
// 구별이 안 됐고, 검정 한 덩어리라 무겁다는 말이 나와 몸통을 브랜드 보라로 바꿨다.
//
// 격자 규칙(왜 이 모양인지):
//  - 12칸. 픽셀 결이 곧 게임 느낌이라 곡선으로 다듬지 않는다. 그리는 쪽은 crispEdges 로 칸 사이 틈을 막는다.
//  - 빛은 가운데(Y)가 진하고 가장자리(T)가 옅다. 옅은 칸은 같은 노랑의 투명도로 낸다 — 색을 하나 더 두면
//    보라 타일 위에서 탁한 갈색이 된다(시안에서 실측).
//  - 손잡이 홈 두 줄은 칸을 비워서 낸다. 바탕색으로 덧칠하면 흰 헤더와 연보라 페이지에서 홈 색이 어긋난다.
//
// OG 이미지와 아이콘은 CSS 바깥(satori, 정적 PNG)에서 그려지므로 globals.css 토큰을 참조할 수 없다.
// 그래서 BRAND_COLOR 가 토큰 값을 손으로 옮겨 들고 있다 — 토큰을 고치면 이쪽도 같이 고친다.

import { SITE } from "@/lib/site";

/** X 몸통, Y 빛 가운데, T 빛 가장자리, . 빈 칸 */
const GRID = [
  "............",
  "...........T",
  ".........TTT",
  "......XXYTTT",
  "XXXXXXXXYYTT",
  "X.X.XXXXYYYT",
  "X.X.XXXXYYYT",
  "XXXXXXXXYYTT",
  "......XXYTTT",
  ".........TTT",
  "...........T",
  "............",
] as const;

/** 심볼 좌표계 한 변(칸 수) */
export const BRAND_VIEWBOX = GRID.length;

export type BrandCellKind = "body" | "beam" | "beamEdge";

const KIND: Record<string, BrandCellKind | undefined> = { X: "body", Y: "beam", T: "beamEdge" };

/** 가로로 이어진 같은 종류의 칸을 한 직사각형으로 묶은 것. rect 수를 칸 수(60여 개)에서 20개 남짓으로 줄인다 */
export type BrandRun = { x: number; y: number; w: number; kind: BrandCellKind };

export const BRAND_RUNS: readonly BrandRun[] = GRID.flatMap((row, y) => {
  const runs: BrandRun[] = [];
  [...row].forEach((ch, x) => {
    const kind = KIND[ch];
    if (!kind) return;
    const last = runs[runs.length - 1];
    if (last && last.kind === kind && last.x + last.w === x) last.w += 1;
    else runs.push({ x, y, w: 1, kind });
  });
  return runs;
});

/** 빛 가장자리 칸의 투명도. 흰 바탕 위 노랑 기준 — 타일 위(흰 칸)는 BEAM_EDGE_ON_TILE_OPACITY */
export const BEAM_EDGE_OPACITY = 0.45;
const BEAM_EDGE_ON_TILE_OPACITY = 0.35;

/**
 * 아이콘 색. ink / bg / accent 는 SITE 가 원천이고, beam 은 globals.css 의 --beam 과 같은 값이다.
 */
export const BRAND_COLOR = {
  ink: SITE.themeColor,
  bg: SITE.backgroundColor,
  accent: SITE.accentColor,
  /** 손전등 빛. globals.css 의 --beam 과 같은 값 */
  beam: "#ffb21e",
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

/**
 * plain: 투명 바탕에 보라 몸통(헤더, OG).
 * tile: 보라 판에 흰 몸통(파비콘, 앱 아이콘). 작은 칸에서 투명 바탕은 브라우저 탭 색에 묻혀서 판을 깐다.
 */
export type BrandSymbolVariant = "plain" | "tile";

type SvgOptions = {
  variant?: BrandSymbolVariant;
  /** tile 판의 모서리 둥글기(판 한 변 대비). iOS, 안드로이드처럼 OS 가 깎는 자리는 0 */
  radius?: number;
  /** 판 대비 심볼이 차지하는 비율. maskable 안전영역을 맞출 때 쓴다 */
  inset?: number;
  size?: number;
};

/** tile 판 기본 둥글기 — 시안의 30칸 판에 rx 7 을 그대로 비율로 옮겼다 */
const TILE_RADIUS = 7 / 30;
/** tile 에서 심볼이 판 안에 차지하는 비율(시안: 30칸 판에 22칸 심볼) */
const TILE_INSET = 22 / 30;

/**
 * 심볼을 SVG 문자열로 만든다.
 * ImageResponse(satori)는 SVG 자식 요소를 직접 그리지 못하고 data URI 이미지만 받으므로,
 * 아이콘/OG 생성 쪽은 React 컴포넌트가 아니라 이 문자열을 쓴다.
 */
export function brandSymbolSvg(options: SvgOptions = {}): string {
  const { variant = "plain", radius = TILE_RADIUS, size = BRAND_VIEWBOX } = options;
  const tile = variant === "tile";
  const inset = options.inset ?? (tile ? TILE_INSET : 1);

  const scaled = BRAND_VIEWBOX / inset;
  const offset = (scaled - BRAND_VIEWBOX) / 2;
  const viewBox = `${-offset} ${-offset} ${scaled} ${scaled}`;

  const fill: Record<BrandCellKind, string> = {
    body: tile ? "#ffffff" : BRAND_COLOR.accent,
    beam: BRAND_COLOR.beam,
    beamEdge: tile ? `#ffffff" opacity="${BEAM_EDGE_ON_TILE_OPACITY}` : `${BRAND_COLOR.beam}" opacity="${BEAM_EDGE_OPACITY}`,
  };
  const board = tile
    ? `<rect x="${-offset}" y="${-offset}" width="${scaled}" height="${scaled}" rx="${scaled * radius}" fill="${BRAND_COLOR.accent}"/>`
    : "";
  const cells = BRAND_RUNS.map((r) => `<rect x="${r.x}" y="${r.y}" width="${r.w}" height="1" fill="${fill[r.kind]}"/>`).join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="${viewBox}">${board}<g shape-rendering="crispEdges">${cells}</g></svg>`;
}

/** satori 의 img src 로 넘길 data URI */
export function brandSymbolDataUri(options: SvgOptions = {}): string {
  return `data:image/svg+xml;utf8,${encodeURIComponent(brandSymbolSvg(options))}`;
}
