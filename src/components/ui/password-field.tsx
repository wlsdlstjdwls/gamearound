"use client";
// 비밀번호 입력 — 표시/숨김 토글(키보드 접근 가능) + 선택적 강도 미터
import { useState } from "react";
import { AUTH_MESSAGES } from "@/lib/auth/messages";
import { passwordStrength } from "@/lib/auth/password-strength";
import { cn } from "@/lib/cn";
import { EyeIcon, EyeOffIcon } from "@/components/ui/icons";
import { TextField, type TextFieldProps } from "@/components/ui/text-field";

type Props = Omit<TextFieldProps, "type" | "trailing"> & {
  /** 현재 값(강도 미터용). 미터를 쓰지 않으면 생략 */
  strengthOf?: string;
};

export function PasswordField({ strengthOf, ...field }: Props) {
  const [visible, setVisible] = useState(false);
  return (
    <div>
      <TextField
        type={visible ? "text" : "password"}
        spellCheck={false}
        autoCapitalize="none"
        trailing={
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            aria-label={visible ? AUTH_MESSAGES.hidePassword : AUTH_MESSAGES.showPassword}
            aria-pressed={visible}
            className={cn(
              "press flex h-9 w-9 items-center justify-center rounded-[var(--radius-sm)] outline-none",
              "focus-visible:ring-2 focus-visible:ring-ink",
              visible ? "text-ink" : "text-dim hover:text-mut",
            )}
          >
            {visible ? <EyeOffIcon /> : <EyeIcon />}
          </button>
        }
        {...field}
      />
      {strengthOf !== undefined && <PasswordStrengthMeter value={strengthOf} />}
    </div>
  );
}

const BAR_COLOR: Record<number, string> = {
  1: "bg-danger",
  2: "bg-warn",
  3: "bg-dim",
  4: "bg-ok",
};

export function PasswordStrengthMeter({ value }: { value: string }) {
  const { score, label } = passwordStrength(value);
  return (
    <div className="mt-2 flex items-center gap-2" aria-live="polite">
      <div className="flex flex-1 gap-1" aria-hidden>
        {[1, 2, 3, 4].map((i) => (
          <span
            key={i}
            className={cn(
              "h-1 flex-1 rounded-full transition-[background-color,transform] duration-base ease-out-emph",
              i <= score ? BAR_COLOR[score] : "bg-surface-2",
              i <= score && "scale-y-125",
            )}
          />
        ))}
      </div>
      <span className={cn("min-w-[3.5rem] text-right text-xs transition-colors duration-base", score >= 3 ? "text-mut" : "text-dim")}>
        {label || " "}
      </span>
    </div>
  );
}
