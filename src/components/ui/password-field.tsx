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

/**
 * strengthOf 를 넘기면 안내 줄(hint) 자리에 강도 막대가 함께 선다 — 안내 한 줄, 막대 한 줄을 따로 쌓았더니
 * 비밀번호 확인 칸이 그만큼 밀려 내려갔다(2026-10-30 사용자 "비밀번호 확인이 너무 아래에"). 비어 있을 때는 안내 글, 입력하면 단계 글이 선다
 */
export function PasswordField({ strengthOf, hint, ...field }: Props) {
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
              // 44px — 규약 §6 의 터치 타깃. 36px 이던 값을 올렸다(2026-09-22 실측).
              // 칸 높이가 46px 이라 44px 까지는 칸 밖으로 넘치지 않는다.
              "press tap flex h-11 w-11 items-center justify-center rounded-[var(--radius-sm)] outline-none",
              "focus-visible:ring-2 focus-visible:ring-ink",
              visible ? "text-ink" : "text-dim hover:text-mut",
            )}
          >
            {visible ? <EyeOffIcon /> : <EyeIcon />}
          </button>
        }
        hint={strengthOf !== undefined ? <PasswordStrengthMeter value={strengthOf} hint={hint} /> : hint}
        {...field}
      />
    </div>
  );
}

/**
 * 단계마다의 막대 색. 초록을 쓰지 않는다(2026-10-30) — 화면의 "괜찮다" 는 브랜드 파랑이 말한다.
 * 빈 칸은 판(--surface-2) 위에서도 보이는 선 색이다 — 같은 회색이면 막대가 있는 줄도 몰랐다
 */
const BAR_COLOR: Record<number, string> = {
  1: "bg-danger",
  2: "bg-warn",
  3: "bg-acc-3",
  4: "bg-acc",
};
const LABEL_COLOR: Record<number, string> = {
  0: "text-dim",
  1: "text-danger",
  2: "text-warn",
  3: "text-acc",
  4: "text-acc",
};

/** 안내 줄 안에 서므로(TextField 의 hint 는 <p>) span 만 쓴다 */
export function PasswordStrengthMeter({ value, hint }: { value: string; hint?: React.ReactNode }) {
  const { score, label } = passwordStrength(value);
  return (
    <span className="flex items-center justify-between gap-3">
      <span aria-live="polite" className={cn("min-w-0 font-semibold transition-colors duration-base", score === 0 ? "font-normal" : "", LABEL_COLOR[score])}>
        {score === 0 ? hint : label}
      </span>
      <span className="flex w-24 shrink-0 gap-1" aria-hidden>
        {[1, 2, 3, 4].map((i) => (
          <span
            key={i}
            className={cn(
              "h-1.5 flex-1 origin-left rounded-full transition-[background-color,transform] duration-base ease-out-emph",
              i <= score ? BAR_COLOR[score] : "bg-line-strong/50",
              i <= score ? "scale-x-100" : "scale-x-90",
            )}
          />
        ))}
      </span>
    </span>
  );
}
