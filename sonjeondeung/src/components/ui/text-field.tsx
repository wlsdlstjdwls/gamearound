"use client";
// 공용 텍스트 입력 — 라벨/힌트/에러 연결(aria-describedby), 포커스 링, 우측 슬롯(비밀번호 토글 등).
// 에러는 등장 시 rise 애니메이션, 필드는 살짝 흔들림(shake). React 19: ref는 일반 prop.
import { useId, type ComponentProps, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { AlertCircleIcon } from "@/components/ui/icons";

export type TextFieldProps = Omit<ComponentProps<"input">, "size"> & {
  label: string;
  /** 라벨을 화면에서 숨기고 스크린리더에만 */
  hideLabel?: boolean;
  hint?: ReactNode;
  error?: string | null;
  trailing?: ReactNode;
  wrapperClassName?: string;
};

export function TextField({ label, hideLabel, hint, error, trailing, wrapperClassName, className, id: idProp, ...input }: TextFieldProps) {
  const autoId = useId();
  const id = idProp ?? autoId;
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const invalid = Boolean(error);

  return (
    <div className={cn("group/field", wrapperClassName)}>
      <label htmlFor={id} className={cn("mb-1.5 block text-[12.5px] font-medium text-mut transition-colors group-focus-within/field:text-ink", hideLabel && "sr-only")}>
        {label}
      </label>
      <div
        key={invalid ? "invalid" : "valid"}
        className={cn(
          "flex items-center rounded-[var(--radius-sm)] border bg-bg transition-[border-color,background-color] duration-base ease-standard",
          "focus-within:border-ink focus-within:bg-surface",
          invalid ? "animate-shake border-danger focus-within:border-danger" : "border-line-strong hover:border-dim",
        )}
      >
        <input
          id={id}
          aria-invalid={invalid || undefined}
          aria-describedby={[hint ? hintId : null, invalid ? errorId : null].filter(Boolean).join(" ") || undefined}
          className={cn(
            "h-[42px] min-h-[42px] w-full flex-1 bg-transparent px-3.5 text-[14px] text-ink outline-none placeholder:text-dim",
            "autofill:shadow-[inset_0_0_0_1000px_var(--bg)] autofill:[-webkit-text-fill-color:var(--ink)]",
            className,
          )}
          {...input}
        />
        {trailing && <div className="flex shrink-0 items-center pr-1.5">{trailing}</div>}
      </div>
      {invalid ? (
        <p id={errorId} role="alert" className="mt-1.5 flex items-start gap-1 text-xs text-danger animate-rise">
          <AlertCircleIcon size={14} className="mt-px shrink-0" />
          <span>{error}</span>
        </p>
      ) : (
        hint && (
          <p id={hintId} className="mt-1.5 text-xs text-dim">
            {hint}
          </p>
        )
      )}
    </div>
  );
}
