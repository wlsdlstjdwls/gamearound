"use client";
// 찜 할인 알림 스위치 — 설정 화면과 가격 알림 화면이 같은 손잡이를 세운다(규약 §3). 발송은 sync/dispatch-wish-alerts.
// 누르는 즉시 넘기고 실패하면 되돌린다(AGENTS §6, settings/personalization-controls 와 같은 수법).
import { useState, useTransition } from "react";
import { Switch } from "@/components/ui/switch";
import { WISH_ALERT_MESSAGES as M } from "@/lib/alerts/messages";
import { cn } from "@/lib/cn";
import { setWishSaleAlertsAction } from "@/app/(user)/alerts/actions";

/** inset: 흰 판 안(설정)의 회색 칸, card: 바탕 위에 홀로 선 흰 판(가격 알림 화면). cn 은 클래스를 겹쳐 쓰지 않아 면 색을 갈래로 받는다 */
const SURFACE = { inset: "bg-surface-2", card: "bg-surface shadow-[var(--elev-1)]" } as const;

export function WishSaleToggle({ initialOn, surface = "inset", className }: { initialOn: boolean; surface?: keyof typeof SURFACE; className?: string }) {
  const [on, setOn] = useState(initialOn);
  const [, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <div className={cn("flex flex-col gap-1.5 rounded-xl px-4 py-3.5", SURFACE[surface], className)}>
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[14px] font-semibold text-ink">{M.title}</p>
          <p className="mt-0.5 text-[12.5px] text-mut">{on ? M.on : M.off}</p>
        </div>
        <Switch
          on={on}
          label={M.title}
          onToggle={() => {
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
          }}
        />
      </div>
      {error && (
        <p role="alert" className="text-[11.5px] text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
