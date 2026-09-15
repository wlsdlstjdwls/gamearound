"use client";
// 세일 시작(또는 종료)까지 남은 시간을 초 단위로 세는 칸.
//
// 왜 서버에서 세지 않나: 이 화면은 한 시간 캐시된다(page 의 revalidate).
// 서버가 센 값을 그리면 최대 한 시간 늦은 초가 첫 화면에 뜨고 하이드레이션에서 숫자가 튄다.
// useNow 가 서버에서 null 을 주는 이유가 정확히 이것이라 그 훅을 그대로 쓴다 — 여기서 타이머를 따로 돌리지 않는다.
// 마운트 전에는 자리만 잡아 둔다(같은 폭이라 값이 들어와도 칸이 밀리지 않는다).
//
// prefers-reduced-motion 은 건드리지 않는다 — 숫자가 바뀌는 건 장식이 아니라 내용이다.
import { cn } from "@/lib/cn";
import { countdownParts } from "@/lib/sales/calendar";
import { COUNTDOWN_UNITS } from "@/lib/sales/messages";
import { useNow } from "@/components/use-now";

const TICK_MS = 1000;
const PLACEHOLDER = "--";

export function Countdown({ targetIso, className }: { targetIso: string; className?: string }) {
  const now = useNow(TICK_MS);
  const parts = now === null ? null : countdownParts(new Date(targetIso).getTime() - now);

  return (
    <div className={cn("flex items-baseline gap-1.5", className)}>
      {COUNTDOWN_UNITS.map((unit) => (
        <div key={unit.key} className="flex items-baseline gap-0.5">
          <span className="min-w-[2ch] text-right text-[20px] font-bold tabular-nums tracking-[-0.02em] text-ink">
            {parts ? String(parts[unit.key]).padStart(2, "0") : PLACEHOLDER}
          </span>
          <span className="text-[12px] text-dim">{unit.label}</span>
        </div>
      ))}
    </div>
  );
}
