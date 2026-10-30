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
 * strengthOf 를 넘기면 칸 바로 밑에 강도 막대가 전체 폭으로 붙는다(TextField 의 under). 칠 때마다 칸과 단계 글이 바뀐다.
 * 안내 글(hint)은 비어 있을 때만 선다 — 치기 시작하면 단계 글이 무엇이 빠졌는지 말하니 같은 말이 두 줄 서지 않게 한다(2026-10-30 사용자)
 */
export function PasswordField({ strengthOf, hint, dense, ...field }: Props) {
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
              // 조밀한 칸(36px)에서는 눈 단추도 칸 안에 들어오게 줄인다 — 넓은 화면만이라 손가락 칸 규칙(44px)과 부딪히지 않는다
              dense && "lg:h-8 lg:w-8",
              "focus-visible:ring-2 focus-visible:ring-ink",
              visible ? "text-ink" : "text-dim hover:text-mut",
            )}
          >
            {visible ? <EyeOffIcon /> : <EyeIcon />}
          </button>
        }
        dense={dense}
        hint={strengthOf ? undefined : hint}
        under={strengthOf !== undefined ? <PasswordStrengthMeter value={strengthOf} /> : undefined}
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

export function PasswordStrengthMeter({ value }: { value: string }) {
  const { score, label } = passwordStrength(value);
  return (
    <div className="flex items-center gap-2.5">
      <div className="flex flex-1 gap-1" aria-hidden>
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
      </div>
      {/* 비어 있을 때는 글자 자리를 비워 둔다 — 안내 글이 칸 아래에서 같은 말을 하고 있다 */}
      <span aria-live="polite" className={cn("min-w-[8.5rem] text-right text-[11.5px] font-semibold transition-colors duration-base", LABEL_COLOR[score])}>
        {label}
      </span>
    </div>
  );
}
