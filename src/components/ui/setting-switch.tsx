"use client";
// 켜고 끄는 설정 한 줄(스위치 + 이름 + 지금 상태 문장). 찜 할인 알림, 주간 맞춤 소식이 같은 손잡이를 쓴다(규약 §3, 2곳이 되어 뽑았다).
// 누르는 즉시 넘기고 실패하면 되돌린다(AGENTS §6, settings/personalization-controls 와 같은 수법). 서버 액션은 부르는 쪽이 넘긴다.
import { useState, useTransition } from "react";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/cn";

export type SettingSwitchResult = { ok: true } | { ok: false; error: string } | null | undefined;

export type SettingSwitchProps = {
  initialOn: boolean;
  title: string;
  /** 켜져 있을 때와 꺼져 있을 때 이름 밑에 붙는 한 줄 */
  onText: string;
  offText: string;
  /** 액션이 사유 없이 실패했을 때 */
  failedText: string;
  action: (on: boolean) => Promise<SettingSwitchResult>;
  /** inset: 흰 판 안(설정)의 회색 칸. inline: 머리 설명 아래 한 줄 — 판으로 세우면 화면이 96px 늘어
   * 알림 두세 개만 있어도 세로 스크롤이 생겼다(2026-10-30 사용자 "스크롤 안 생겨도 될 때도 생기네") */
  surface?: "inset" | "inline";
  className?: string;
  /** 상태 문장 밑에 덧붙일 것(켜졌을 때만 보이는 링크 등). 지금 켜졌는지를 받는다 — 누른 순간 값이라 서버 응답을 기다리지 않는다 */
  extra?: (on: boolean) => React.ReactNode;
};

export function SettingSwitch({ initialOn, title, onText, offText, failedText, action, surface = "inset", className, extra }: SettingSwitchProps) {
  const [on, setOn] = useState(initialOn);
  const [, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const toggle = () => {
    const next = !on;
    setOn(next);
    setError(null);
    start(async () => {
      const res = await action(next);
      if (!res?.ok) {
        setOn(!next);
        setError(res && !res.ok ? res.error : failedText);
      }
    });
  };
  const errorLine = error && (
    <p role="alert" className="text-[11.5px] text-danger">
      {error}
    </p>
  );
  if (surface === "inline") {
    return (
      <div className={cn("flex flex-col gap-1", className)}>
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
          <Switch on={on} label={title} onToggle={toggle} />
          <span className="text-[13px] font-semibold text-ink-2">{title}</span>
          <span className="text-[12.5px] text-dim">{on ? onText : offText}</span>
        </div>
        {extra?.(on)}
        {errorLine}
      </div>
    );
  }
  return (
    <div className={cn("flex flex-col gap-1.5 rounded-xl bg-surface-2 px-4 py-3.5", className)}>
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[14px] font-semibold text-ink">{title}</p>
          <p className="mt-0.5 text-[12.5px] text-mut">{on ? onText : offText}</p>
          {extra?.(on)}
        </div>
        <Switch on={on} label={title} onToggle={toggle} />
      </div>
      {errorLine}
    </div>
  );
}
