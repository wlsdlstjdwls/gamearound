"use client";
// 커스텀 체크박스 — 네이티브 input은 sr-only로 두고(키보드/폼 제출 유지) 시각은 span으로. 체크 시 pop.
import { useId, type ComponentProps, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { CheckIcon } from "@/components/ui/icons";

type Props = Omit<ComponentProps<"input">, "type" | "children"> & {
  children: ReactNode;
  error?: string | null;
  /** 위아래 여백을 줄인 줄(가입 동의 묶음). 눌리는 넓이는 tap 이 44px 로 지킨다 */
  dense?: boolean;
};

export function Checkbox({ children, error, className, dense = false, id: idProp, checked, ...input }: Props) {
  const autoId = useId();
  const id = idProp ?? autoId;
  const errorId = `${id}-error`;
  return (
    <div>
      <label htmlFor={id} className={cn("group/cb tap flex cursor-pointer items-start gap-2.5 text-sm text-mut", dense ? "py-0.5" : "py-1", className)}>
        <input id={id} type="checkbox" className="peer sr-only" checked={checked} aria-invalid={Boolean(error) || undefined} aria-describedby={error ? errorId : undefined} {...input} />
        <span
          aria-hidden
          className={cn(
            "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-[4px] border transition-[background-color,border-color,box-shadow] duration-base ease-standard",
            "peer-focus-visible:ring-2 peer-focus-visible:ring-ink peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-bg",
            "peer-checked:animate-pop peer-checked:border-ink peer-checked:bg-ink peer-checked:[&>svg]:opacity-100 peer-checked:[&>svg]:scale-100",
            error ? "border-danger" : "border-line-strong group-hover/cb:border-ink",
          )}
        >
          <CheckIcon size={13} className="scale-50 text-on-ink opacity-0 transition-[opacity,transform] duration-fast ease-out-emph" />
        </span>
        <span className="leading-relaxed">{children}</span>
      </label>
      {error && (
        <p id={errorId} role="alert" className="mt-1 text-xs text-danger animate-rise">
          {error}
        </p>
      )}
    </div>
  );
}
