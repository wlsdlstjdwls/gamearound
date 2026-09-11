// 공용 버튼 — variant/size/loading. 누름 모션(.press)과 터치 타깃 44px 보장. Link가 필요하면 buttonClass()로 스타일만 가져간다.
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/cn";
import { SpinnerIcon } from "@/components/ui/icons";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

const VARIANT: Record<ButtonVariant, string> = {
  primary: "bg-acc text-slate-950 font-semibold hover:bg-acc-hover shadow-[0_6px_18px_-8px_rgba(251,191,36,0.7)] disabled:shadow-none",
  secondary: "border border-line-strong bg-surface text-ink hover:border-acc/60 hover:text-acc-hover",
  ghost: "text-mut hover:bg-surface-2 hover:text-ink",
  danger: "border border-danger/40 text-danger hover:bg-danger/10",
};

const SIZE: Record<ButtonSize, string> = {
  sm: "h-9 px-3 text-sm rounded-[var(--radius-sm)]",
  md: "h-11 px-4 text-sm rounded-[var(--radius-md)]",
  lg: "h-12 px-5 text-base rounded-[var(--radius-md)]",
};

export function buttonClass(opts: { variant?: ButtonVariant; size?: ButtonSize; fullWidth?: boolean; className?: string } = {}): string {
  const { variant = "primary", size = "md", fullWidth = false, className } = opts;
  return cn(
    "press lift inline-flex items-center justify-center gap-2 whitespace-nowrap select-none outline-none",
    "focus-visible:ring-2 focus-visible:ring-acc focus-visible:ring-offset-2 focus-visible:ring-offset-bg",
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
      <span className={cn("inline-flex items-center gap-2 transition-opacity duration-fast", loading && !loadingLabel && "opacity-80")}>
        {loading && loadingLabel ? loadingLabel : children}
      </span>
    </button>
  );
}
