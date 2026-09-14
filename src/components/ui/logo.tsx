// 브랜드 심볼과 워드마크 락업. 화면 어디서든 로고가 필요하면 여기서 가져다 쓴다.
// 기하 정보는 lib/brand.ts 가 원천이고(파비콘, 앱 아이콘, OG 이미지와 같은 좌표를 쓴다),
// 이 파일은 그것을 화면용 React 엘리먼트로 얹는 일만 한다.
//
// 바디는 currentColor 라 부모의 글자색을 따른다. 방향키, 버튼은 evenodd 로 뚫려 있어
// 흰 헤더든 오프화이트 페이지든 잉크 배너든 바탕이 그대로 비친다.
import { BRAND_VIEWBOX, brandAccentDot, brandBodyPath, type BrandSymbolVariant } from "@/lib/brand";
import { cn } from "@/lib/cn";
import { SITE } from "@/lib/site";

/** 잉크 배경 위에서는 악센트를 한 단계 밝은 토큰으로 바꾼다 */
type Tone = "default" | "onInk";

type SymbolProps = {
  size?: number;
  variant?: BrandSymbolVariant;
  tone?: Tone;
  className?: string;
};

/** 심볼 기본 크기 — 헤더 로고 기준. 워드마크 전체 글자 높이에 맞춘 값이다 */
const DEFAULT_SYMBOL_SIZE = 26;

export function BrandSymbol({ size = DEFAULT_SYMBOL_SIZE, variant = "full", tone = "default", className }: SymbolProps) {
  const dot = brandAccentDot(variant);
  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${BRAND_VIEWBOX} ${BRAND_VIEWBOX}`}
      aria-hidden
      focusable="false"
      className={cn("shrink-0", className)}
    >
      <path d={brandBodyPath(variant)} fill="currentColor" fillRule="evenodd" />
      <circle cx={dot.cx} cy={dot.cy} r={dot.r} className={tone === "onInk" ? "fill-acc-on-ink" : "fill-acc"} />
    </svg>
  );
}

type LockupProps = {
  size?: number;
  tone?: Tone;
  className?: string;
};

/**
 * 심볼 + 워드마크. 간격은 심볼 폭의 1/3 —
 * 컨트롤러는 가로로 넓어서 글자 x-height 에 맞추면 혼자 커 보인다.
 */
export function BrandLockup({ size = DEFAULT_SYMBOL_SIZE, tone = "default", className }: LockupProps) {
  return (
    <span className={cn("inline-flex items-center", className)} style={{ gap: Math.round(size / 3) }}>
      <BrandSymbol size={size} tone={tone} />
      <span className="font-bold tracking-[-0.035em]" style={{ fontSize: Math.round(size * 0.66) }}>
        {SITE.name}
      </span>
    </span>
  );
}
