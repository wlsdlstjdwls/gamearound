// 공용 버튼 — variant/size/loading. 누름 모션(.press)과 터치 타깃 보장. Link가 필요하면 buttonClass()로 스타일만 가져간다.
// 리디자인(2026-09-21): 주 버튼은 잉크 필, 보조는 투명 배경 + 1px 테두리.
// 2026-09-22: 주 버튼에만 그림자 한 겹을 돌려놨다 — 화면에서 누를 수 있는 것이 그것 하나뿐인 자리가
// 많은데, 면만 있는 판은 "표시" 로도 읽힌다. 보조, ghost 는 그대로 평면이다(둘 다 배경이 없다).
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/cn";
import { SpinnerIcon } from "@/components/ui/icons";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

const VARIANT: Record<ButtonVariant, string> = {
  primary: "bg-ink text-on-ink font-semibold shadow-1 hover:bg-ink-2 hover:shadow-2",
  // 흰 판이 사라진 화면이라 보조 버튼의 배경도 투명하다 — 판 위의 판으로 읽히지 않게 테두리만 남긴다
  secondary: "border border-line-strong bg-transparent text-ink hover:border-ink",
  ghost: "text-mut hover:bg-surface-2 hover:text-ink",
  danger: "border border-line-strong bg-transparent text-danger hover:border-danger",
};

/*
 * tap 은 손가락 기기에서만 최소 높이를 44px 로 올린다(globals.css). sm(32px), md(36px) 는
 * 마우스 화면의 조밀함을 위한 값이고 터치로는 작다 — lg 는 이미 44px 라 붙이지 않는다.
 */
const SIZE: Record<ButtonSize, string> = {
  sm: "tap h-8 px-3.5 text-[12.5px]",
  md: "tap h-10 px-4 text-[13.5px]",
  lg: "h-[46px] px-5 text-[14px] rounded-xl",
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
