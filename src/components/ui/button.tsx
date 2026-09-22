// 공용 버튼 — variant/size/loading. 누름 모션(.press)과 터치 타깃 보장. Link가 필요하면 buttonClass()로 스타일만 가져간다.
// 리디자인(2026-09-21): 주 버튼은 잉크 필, 보조는 투명 배경 + 1px 테두리.
// 2026-09-22: 주 버튼에만 그림자 한 겹을 돌려놨다 — 화면에서 누를 수 있는 것이 그것 하나뿐인 자리가
// 많은데, 면만 있는 판은 "표시" 로도 읽힌다. 보조, ghost 는 그대로 평면이다(둘 다 배경이 없다).
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/cn";
import { SpinnerIcon } from "@/components/ui/icons";

export type ButtonVariant = "primary" | "accent" | "soft" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg" | "row";

/*
 * 2026-09-22 — "버튼이 전체적으로 밋밋하다"(사용자). 두 갈래를 더했다.
 *
 * 문제는 표 안의 버튼들이었다. 값 줄마다 서는 버튼이 배경 한 겹(bg-surface-2)뿐이라,
 * 면이 바탕과 3% 차이인 이 화면에서는 "회색 글자 덩어리" 로 읽혔다 — 누를 곳이라는 신호가 없었다.
 * 색을 더 넣는 대신 **떠 있게** 한다: 헤어라인 링 한 줄 + hover 에서 그림자 한 단.
 * 색은 여전히 브랜드 하나만 쓴다(accent).
 */
const VARIANT: Record<ButtonVariant, string> = {
  primary: "bg-ink text-on-ink font-semibold shadow-1 hover:bg-ink-2 hover:shadow-2",
  /** 브랜드 필 — 그 줄에서 실제로 누를 자리가 하나일 때(표의 최저가 행, 머리바의 알림) */
  accent: "bg-acc text-on-ink font-semibold shadow-1 hover:bg-acc-hover hover:shadow-2",
  /**
   * 채운 보조 — 표 안에 여러 개가 서는 자리.
   * 2026-09-22 2차(사용자: "버튼에 색이나 테두리 주는 게 낫지 않나"): 면 + 링만으로는 여전히
   * 글자 덩어리로 읽혀서, **흰 면 + 1px 테두리**로 바꾸고 손이 닿으면 브랜드로 물들게 했다.
   * 이 화면에서 테두리를 가진 것은 버튼뿐이라(토큰 머리 주석의 예외) 선 하나가 곧 "누를 곳" 이다.
   */
  soft: "border border-line-strong bg-surface text-ink font-semibold shadow-hair hover:border-acc hover:bg-acc-soft hover:text-acc",
  // 흰 판이 사라진 화면이라 보조 버튼의 배경도 투명하다 — 판 위의 판으로 읽히지 않게 테두리만 남긴다.
  // hover 에서 면을 한 겹 깔아 준다: 테두리 색만 바뀌면 손이 닿았는지가 잘 안 보였다
  secondary: "border border-line-strong bg-transparent text-ink hover:border-ink hover:bg-surface-2",
  ghost: "text-mut hover:bg-surface-2 hover:text-ink",
  danger: "border border-line-strong bg-transparent text-danger hover:border-danger hover:bg-danger-soft",
};

/*
 * tap 은 손가락 기기에서만 최소 높이를 44px 로 올린다(globals.css). sm(32px), md(36px) 는
 * 마우스 화면의 조밀함을 위한 값이고 터치로는 작다 — lg 는 이미 44px 라 붙이지 않는다.
 */
const SIZE: Record<ButtonSize, string> = {
  sm: "tap h-8 px-3.5 text-[12.5px]",
  md: "tap h-10 px-4 text-[13.5px]",
  lg: "h-[46px] px-5 text-[14px] rounded-xl",
  /** 값 표의 줄 안에 서는 크기. 줄 높이(15px 패딩 + 값)를 안 키우려고 md 보다 4px 낮다 */
  row: "tap h-9 px-[15px] text-[13px] rounded-xl",
};

export function buttonClass(opts: { variant?: ButtonVariant; size?: ButtonSize; fullWidth?: boolean; className?: string } = {}): string {
  const { variant = "primary", size = "md", fullWidth = false, className } = opts;
  return cn(
    "press lift inline-flex select-none items-center justify-center gap-1.5 whitespace-nowrap rounded-[var(--radius-sm)] outline-none",
    "focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:ring-offset-bg",
    "disabled:cursor-not-allowed disabled:opacity-60",
    VARIANT[variant],
    SIZE[size],
    fullWidth && "w-full",
    className,
  );
}

export type ButtonProps = ComponentProps<"button"> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  loading?: boolean;
  /** 로딩 중 버튼 텍스트(없으면 children 유지 + 스피너) */
  loadingLabel?: ReactNode;
};

export function Button({ variant, size, fullWidth, loading = false, loadingLabel, className, children, disabled, type = "button", ...rest }: ButtonProps) {
  return (
    <button
      type={type}
      className={buttonClass({ variant, size, fullWidth, className })}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading && <SpinnerIcon size={16} />}
      <span className={cn("inline-flex items-center gap-1.5 transition-opacity duration-fast", loading && !loadingLabel && "opacity-80")}>
        {loading && loadingLabel ? loadingLabel : children}
      </span>
    </button>
  );
}
