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

/**
 * 진행 중인 회차 하나만 크게 센다(hero). 나머지 줄은 같은 값을 작게 쓴다.
 * tile 은 홈 세일 배너용이다 — 잉크 판 위에 칸을 하나씩 세워 숫자가 바뀌는 자리가 눈에 보이게 한다.
 */
export function Countdown({ targetIso, size = "row", className }: { targetIso: string; size?: "row" | "hero" | "tile"; className?: string }) {
  const now = useNow(TICK_MS);
  const parts = now === null ? null : countdownParts(new Date(targetIso).getTime() - now);
  const value = (key: (typeof COUNTDOWN_UNITS)[number]["key"]) => (parts ? String(parts[key]).padStart(2, "0") : PLACEHOLDER);

  if (size === "tile") {
    return (
      <div className={cn("flex items-stretch gap-1.5", className)} role="timer" aria-live="off">
        {COUNTDOWN_UNITS.map((unit) => (
          <div
            key={unit.key}
            className="flex min-w-[52px] flex-col items-center justify-center rounded-[var(--radius-sm)] bg-[color-mix(in_oklab,var(--on-ink)_9%,transparent)] px-2 py-2 ring-1 ring-[color-mix(in_oklab,var(--on-ink)_12%,transparent)] ring-inset"
          >
            <span className="text-[22px] leading-none font-extrabold tracking-[-0.04em] tabular-nums sm:text-[26px]">{value(unit.key)}</span>
            <span className="mt-1 text-[11px] font-semibold opacity-70">{unit.label}</span>
          </div>
        ))}
      </div>
    );
  }

  const hero = size === "hero";
  return (
    <div className={cn("flex items-baseline", hero ? "gap-2.5" : "gap-1.5", className)}>
      {COUNTDOWN_UNITS.map((unit) => (
        <div key={unit.key} className="flex items-baseline gap-0.5">
          <span
            className={cn(
              "min-w-[2ch] text-right font-extrabold tabular-nums",
              hero ? "text-[32px] leading-none tracking-[-0.05em] text-acc sm:text-[44px]" : "text-[18px] tracking-[-0.03em] text-ink",
            )}
          >
            {value(unit.key)}
          </span>
          <span className={hero ? "text-[13px] font-semibold text-acc" : "text-[12px] text-dim"}>{unit.label}</span>
        </div>
      ))}
    </div>
  );
}
