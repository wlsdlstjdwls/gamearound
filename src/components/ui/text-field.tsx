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
          // 테두리를 실제 border 가 아니라 안쪽 그림자로 두는 이유(2026-09-21 리디자인):
          // 입력칸이 채운 판(--surface-2) 위에 서는 자리라 흰 면이 곧 "쓸 수 있는 칸" 이고,
          // 거기에 1px 선까지 더하면 판 안의 판이 된다. 선은 포커스와 오류에서만 말한다
          "flex items-center rounded-xl bg-surface transition-[box-shadow] duration-base ease-standard",
          "shadow-[0_0_0_1px_var(--line)] focus-within:shadow-[0_0_0_1px_var(--acc),0_0_0_4px_var(--acc-glow)]",
          invalid && "animate-shake shadow-[0_0_0_1px_var(--danger)] focus-within:shadow-[0_0_0_1px_var(--danger)]",
        )}
      >
        <input
          id={id}
          aria-invalid={invalid || undefined}
          aria-describedby={[hint ? hintId : null, invalid ? errorId : null].filter(Boolean).join(" ") || undefined}
          className={cn(
            "h-[46px] min-h-[46px] w-full flex-1 bg-transparent px-3.5 text-[14px] text-ink outline-none placeholder:text-dim",
            "autofill:shadow-[inset_0_0_0_1000px_var(--surface)] autofill:[-webkit-text-fill-color:var(--ink)]",
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
