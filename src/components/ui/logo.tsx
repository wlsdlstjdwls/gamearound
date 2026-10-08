// 브랜드 심볼과 워드마크 락업. 화면 어디서든 로고가 필요하면 여기서 가져다 쓴다.
// 격자는 lib/brand.ts 가 원천이고(파비콘, 앱 아이콘, OG 이미지와 같은 칸을 쓴다),
// 이 파일은 그것을 화면용 React 엘리먼트로 얹는 일만 한다.
//
// 색은 토큰 클래스로 칠한다(몸통 --acc, 빛 --beam) — 다크에서 보라가 밝은 쪽으로 바뀌는 것을 그대로 따른다.
// 손잡이 홈은 칸이 비어 있어 흰 헤더든 연보라 페이지든 바탕이 그대로 비친다.
import { BEAM_EDGE_OPACITY, BRAND_RUNS, BRAND_VIEWBOX, type BrandCellKind } from "@/lib/brand";
import { cn } from "@/lib/cn";
import { SITE } from "@/lib/site";

/**
 * default: 보라 몸통 + 노란 빛.
 * onInk: 잉크 배경 위 — 몸통을 한 단계 밝은 보라로.
 * mono: 전부 글자색(currentColor). 이미지 대체 면처럼 브랜드 색이 튀면 안 되는 자리.
 */
type Tone = "default" | "onInk" | "mono";

const TONE_CLASS: Record<Tone, Record<BrandCellKind, string>> = {
  default: { body: "fill-acc", beam: "fill-beam", beamEdge: "fill-beam" },
  onInk: { body: "fill-acc-on-ink", beam: "fill-beam", beamEdge: "fill-beam" },
  mono: { body: "fill-current", beam: "fill-current", beamEdge: "fill-current" },
};

type SymbolProps = {
  size?: number;
  tone?: Tone;
  className?: string;
};

/** 심볼 기본 폭 — 헤더 로고 기준. 손전등은 가로로 길어서 폭으로 잡아야 워드마크와 무게가 맞는다 */
const DEFAULT_SYMBOL_SIZE = 32;

/**
 * 격자 맨 위, 맨 아래 한 줄은 비어 있다(lib/brand.ts). 화면에서는 그 두 줄을 잘라 그린다 —
 * 남겨 두면 헤더에서 손전등이 글자보다 작아 보였다(2026-10-08 화면 확인).
 */
const CROP_ROWS = 1;
const VISIBLE_ROWS = BRAND_VIEWBOX - CROP_ROWS * 2;

export function BrandSymbol({ size = DEFAULT_SYMBOL_SIZE, tone = "default", className }: SymbolProps) {
  const cls = TONE_CLASS[tone];
  return (
    <svg
      width={size}
      height={Math.round((size * VISIBLE_ROWS) / BRAND_VIEWBOX)}
      viewBox={`0 ${CROP_ROWS} ${BRAND_VIEWBOX} ${VISIBLE_ROWS}`}
      shapeRendering="crispEdges"
      aria-hidden
      focusable="false"
      className={cn("shrink-0", className)}
    >
      {BRAND_RUNS.map((r) => (
        <rect
          key={`${r.x}-${r.y}`}
          x={r.x}
          y={r.y}
          width={r.w}
          height={1}
          className={cls[r.kind]}
          opacity={r.kind === "beamEdge" ? BEAM_EDGE_OPACITY : undefined}
        />
      ))}
    </svg>
  );
}

type LockupProps = {
  size?: number;
  tone?: Tone;
  className?: string;
  /** 워드마크 글자에 얹을 클래스. 좁은 화면에서 글자만 숨기고 심볼만 남길 때 쓴다(헤더) */
  wordmarkClassName?: string;
};

/** 워드마크 글자 크기 = 심볼 폭 × 이 비율. 기본 32 에서 16px — 소문자 시절 헤더 글자 크기(17px)와 거의 같다 */
const WORDMARK_RATIO = 0.5;

/**
 * 심볼 + 워드마크. 간격은 심볼 폭의 1/4.
 * 워드마크는 대문자라 자간을 벌린다(소문자 때는 좁혔다) — 대문자끼리 붙으면 한 덩어리로 뭉친다.
 *
 * 워드마크를 숨겨도 간격은 따로 지울 필요가 없다 — display:none 인 자식은 flex gap 을 만들지 않는다.
 */
export function BrandLockup({ size = DEFAULT_SYMBOL_SIZE, tone = "default", className, wordmarkClassName }: LockupProps) {
  return (
    <span className={cn("inline-flex items-center", className)} style={{ gap: Math.round(size / 4) }}>
      <BrandSymbol size={size} tone={tone} />
      <span className={cn("font-extrabold tracking-wide", wordmarkClassName)} style={{ fontSize: Math.round(size * WORDMARK_RATIO) }}>
        {SITE.name}
      </span>
    </span>
  );
}
