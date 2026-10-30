"use client";
// 찜 할인 알림 스위치 — 설정 화면과 가격 알림 화면이 같은 손잡이를 세운다(규약 §3). 발송은 sync/dispatch-wish-alerts.
// 누르는 즉시 넘기고 실패하면 되돌린다(AGENTS §6, settings/personalization-controls 와 같은 수법).
import { useState, useTransition } from "react";
import { Switch } from "@/components/ui/switch";
import { WISH_ALERT_MESSAGES as M } from "@/lib/alerts/messages";
import { cn } from "@/lib/cn";
import { setWishSaleAlertsAction } from "@/app/(user)/alerts/actions";

/** inset: 흰 판 안(설정)의 회색 칸. inline: 머리 설명 아래 한 줄(가격 알림 화면) — 판으로 세우면 화면이 96px 늘어
 * 알림 두세 개만 있어도 세로 스크롤이 생겼다(2026-10-30 사용자 "스크롤 안 생겨도 될 때도 생기네") */
export function WishSaleToggle({ initialOn, surface = "inset", className }: { initialOn: boolean; surface?: "inset" | "inline"; className?: string }) {
  const [on, setOn] = useState(initialOn);
  const [, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const toggle = () => {
    const next = !on;
    setOn(next);
    setError(null);
    start(async () => {
      const res = await setWishSaleAlertsAction(next);
      if (!res?.ok) {
        setOn(!next);
        setError(res && !res.ok ? res.error : M.failed);
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
          <Switch on={on} label={M.title} onToggle={toggle} />
          <span className="text-[13px] font-semibold text-ink-2">{M.title}</span>
          <span className="text-[12.5px] text-dim">{on ? M.on : M.off}</span>
        </div>
        {errorLine}
      </div>
    );
  }
  return (
    <div className={cn("flex flex-col gap-1.5 rounded-xl bg-surface-2 px-4 py-3.5", className)}>
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[14px] font-semibold text-ink">{M.title}</p>
          <p className="mt-0.5 text-[12.5px] text-mut">{on ? M.on : M.off}</p>
        </div>
        <Switch on={on} label={M.title} onToggle={toggle} />
      </div>
      {errorLine}
    </div>
  );
}
