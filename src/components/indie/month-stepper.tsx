"use client";
// 명예의 전당 달 고르기 — 이전 달, 달 이름, 다음 달(2026-10-28, 사용자: "날짜가 버튼 형태라 UI 개선 필요").
// 예전에는 여섯 달을 칩 여섯 개로 늘어놓아 한 줄을 다 먹고, 390 폭에서는 가로로 밀어야 했다. 달은 차례가 있는 값이라
// 앞뒤로 한 칸씩 넘기는 것이 자연스럽다. 이번 달이 아니면 "이번 달" 로 바로 돌아오는 칩을 하나 더 세운다.
// 화살표는 NavChip(같은 무리 "ym")이라 누른 순간 켜지고, 가운데 달 이름은 useNavPicked 로 고른 달을 먼저 그린다(AGENTS 6장).
import { ChevronLeftIcon } from "@/components/ui/icons";
import { NavChip, useNavPicked } from "@/components/ui/nav-pending";

type Month = { ym: string; label: string; href: string };

export function MonthStepper({ months, current, nowYm, labels }: { months: readonly Month[]; current: string; nowYm: string; labels: { group: string; prev: string; next: string; thisMonth: string; nowTag: string } }) {
  const picked = useNavPicked("ym");
  const shownYm = months.find((m) => m.href === picked)?.ym ?? current;
  const i = months.findIndex((m) => m.ym === shownYm);
  // months 는 최신 달이 앞이다 — "이전 달" 은 뒤 칸, "다음 달" 은 앞 칸
  const older = i >= 0 ? months[i + 1] : undefined;
  const newer = i > 0 ? months[i - 1] : undefined;
  const shown = months[i];
  return (
    <div role="group" aria-label={labels.group} className="flex items-center gap-2">
      <div className="flex items-center gap-1 rounded-full bg-surface p-1 shadow-hair">
        {older ? (
          <NavChip group="ym" href={older.href} aria-label={labels.prev} size="page">
            <ChevronLeftIcon size={16} />
          </NavChip>
        ) : (
          <span aria-hidden className="grid h-8 w-10 place-items-center text-line-strong">
            <ChevronLeftIcon size={16} />
          </span>
        )}
        <span aria-live="polite" className="min-w-[124px] text-center text-[15px] font-extrabold tabular-nums tracking-[-0.02em] text-ink">
          {shown?.label}
          {shownYm === nowYm && <span className="ml-1.5 align-[1px] text-[11.5px] font-bold text-acc">{labels.nowTag}</span>}
        </span>
        {newer ? (
          <NavChip group="ym" href={newer.href} aria-label={labels.next} size="page">
            <ChevronLeftIcon size={16} className="rotate-180" />
          </NavChip>
        ) : (
          <span aria-hidden className="grid h-8 w-10 place-items-center text-line-strong">
            <ChevronLeftIcon size={16} className="rotate-180" />
          </span>
        )}
      </div>
      {shownYm !== nowYm && months[0] && (
        <NavChip group="ym" href={months[0].href} compact outline className="shrink-0 whitespace-nowrap">
          {labels.thisMonth}
        </NavChip>
      )}
    </div>
  );
}
