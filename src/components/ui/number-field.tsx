"use client";
// 금액, 개수 칸(2026-10-29, 사용자 "입력 필드에서 컨트롤+z 로 되돌리기가 안 된다").
//
// 앞 판은 칠 때마다 쉼표를 다시 찍었다(6900 을 치면 칸이 "6,900" 으로 바뀐다). React 가 칸 값을 손으로 갈아 끼우면 브라우저는
// 그 칸의 되돌리기 기록을 버린다 — 그래서 Ctrl+Z 가 먹지 않았고, 커서도 끝으로 튀어 "6,900" 끝에 12 를 치면 690,012 가 됐다.
// 이제 칸을 누르고 있는 동안은 친 글자를 그대로 두고(값은 숫자만 뽑아 바로 올린다), 칸을 떠날 때만 쉼표를 찍는다.
// 숫자와 쉼표가 아닌 글자는 받지 않는다 — 그 한 번만 값이 되돌려진다.
import { useState } from "react";
import { TextField, type TextFieldProps } from "@/components/ui/text-field";

/** 친 글에서 숫자만. 비면 0(범위 검증은 저장할 때 스키마가 한다) */
export function toInt(raw: string): number {
  const digits = raw.replace(/[^0-9]/g, "");
  return digits ? Number(digits) : 0;
}

const ALLOWED = /^[0-9,]*$/;

export function NumberField({ value, onValue, onFocus, onBlur, ...rest }: Omit<TextFieldProps, "value" | "onChange"> & { value: number; onValue: (n: number) => void }) {
  /** 누르고 있는 동안 친 글자. null 이면 바깥 값을 쉼표 찍어 보인다(되돌리기 단추처럼 바깥에서 바뀐 값도 그대로 따라간다) */
  const [draft, setDraft] = useState<string | null>(null);
  const shown = draft ?? (value ? value.toLocaleString("ko-KR") : "");
  return (
    <TextField
      inputMode="numeric"
      autoComplete="off"
      {...rest}
      value={shown}
      onFocus={(e) => {
        setDraft(shown);
        onFocus?.(e);
      }}
      onChange={(e) => {
        const raw = e.target.value;
        if (!ALLOWED.test(raw)) return;
        setDraft(raw);
        onValue(toInt(raw));
      }}
      onBlur={(e) => {
        setDraft(null);
        onBlur?.(e);
      }}
    />
  );
}
