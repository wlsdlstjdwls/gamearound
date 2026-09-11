"use client";
// 커스텀 체크박스 — 네이티브 input은 sr-only로 두고(키보드/폼 제출 유지) 시각은 span으로. 체크 시 pop + 글로우.
import { useId, type ComponentProps, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { CheckIcon } from "@/components/ui/icons";

type Props = Omit<ComponentProps<"input">, "type" | "children"> & {
  children: ReactNode;
  error?: string | null;
};

export function Checkbox({ children, error, className, id: idProp, checked, ...input }: Props) {
  const autoId = useId();
  const id = idProp ?? autoId;
  const errorId = `${id}-error`;
  return (
    <div>
      <label htmlFor={id} className={cn("group/cb flex cursor-pointer items-start gap-2.5 py-1 text-sm text-mut", className)}>
        <input id={id} type="checkbox" className="peer sr-only" checked={checked} aria-invalid={Boolean(error) || undefined} aria-describedby={error ? errorId : undefined} {...input} />
        <span
          aria-hidden
          className={cn(
            "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-[6px] border transition-[background-color,border-color,box-shadow] duration-base ease-standard",
            "peer-focus-visible:ring-2 peer-focus-visible:ring-acc peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-bg",
            "peer-checked:animate-pop peer-checked:border-acc peer-checked:bg-acc peer-checked:shadow-[0_4px_12px_var(--acc-glow)] peer-checked:[&>svg]:opacity-100 peer-checked:[&>svg]:scale-100",
            error ? "border-danger" : "border-line-strong group-hover/cb:border-slate-500",
          )}
        >
          <CheckIcon size={13} className="scale-50 text-slate-950 opacity-0 transition-[opacity,transform] duration-fast ease-out-emph" />
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
