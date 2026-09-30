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
  /** 칸 바로 밑에 뜨는 판(제안 목록, components/ui/suggest). 칸 상자를 기준으로 선다 */
  popup?: ReactNode;
  wrapperClassName?: string;
};

export function TextField({ label, hideLabel, hint, error, trailing, popup, wrapperClassName, className, id: idProp, ...input }: TextFieldProps) {
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
        className={cn(
          // key 를 붙이지 않는다(2026-09-23). 예전에는 key={invalid ? "invalid" : "valid"} 로 shake 를 다시 태웠는데,
          // key 가 바뀌면 이 div 와 **안의 <input> 이 통째로 새로 만들어진다** — 치던 값이 날아갔다.
          // 오류가 뜰 때(blur)도, 오류를 고치는 중에 오류가 사라질 때도 칸이 비었다.
          // shake 는 key 없이도 정상이다: animate-shake 가 없다가 붙는 순간 애니메이션이 처음부터 돈다.
          // (같은 칸에 다른 오류가 이어 뜨는 경우는 key 가 있던 시절에도 "invalid" 로 같아서 replay 가 없었다)
          //
          // 테두리를 실제 border 가 아니라 안쪽 그림자로 두는 이유(2026-09-21 리디자인):
          // 입력칸이 채운 판(--surface-2) 위에 서는 자리라 흰 면이 곧 "쓸 수 있는 칸" 이고,
          // 거기에 1px 선까지 더하면 판 안의 판이 된다. 선은 포커스와 오류에서만 말한다
          "relative flex items-center rounded-xl bg-surface transition-[box-shadow] duration-base ease-standard",
          "shadow-[0_0_0_1px_var(--line)] focus-within:shadow-[0_0_0_1px_var(--acc),0_0_0_4px_var(--acc-glow)]",
          invalid && "animate-shake shadow-[0_0_0_1px_var(--danger)] focus-within:shadow-[0_0_0_1px_var(--danger)]",
        )}
      >
        <input
          id={id}
          aria-invalid={invalid || undefined}
          aria-describedby={[hint ? hintId : null, invalid ? errorId : null].filter(Boolean).join(" ") || undefined}
          className={cn(
            // 글자 16px 은 취향이 아니라 규약이다(AGENTS.md §6) — iOS 사파리는 16px 미만 입력칸에
            // 포커스가 가면 화면을 확대하고, 확대된 배율은 입력을 마쳐도 돌아오지 않는다.
            // 14px 이던 값을 올렸다(2026-09-22 실측: 로그인, 가입의 모든 칸이 14px 이었다).
            // 높이는 46px 그대로라 줄 위치는 밀리지 않는다 — 글자만 커진다.
            "h-[46px] min-h-[46px] w-full flex-1 bg-transparent px-3.5 text-[16px] text-ink outline-none placeholder:text-dim",
            "autofill:shadow-[inset_0_0_0_1000px_var(--surface)] autofill:[-webkit-text-fill-color:var(--ink)]",
            className,
          )}
          {...input}
        />
        {trailing && <div className="flex shrink-0 items-center pr-1.5">{trailing}</div>}
        {popup}
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
