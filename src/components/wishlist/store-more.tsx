"use client";
// 찜 카드 기기 줄의 "+1" — 같은 기기를 파는 다른 스토어가 있다는 표시(2026-10-30 사용자 "PC 에 Epic 도 있지 않나, 어떻게 표기하나").
// 카드가 270px 까지 좁아져 줄에 스토어 이름을 적을 자리가 30px 남짓이다("Steam" 도 잘렸다). 그래서 줄에는 수만 두고,
// 누르거나 올리면 스토어별 값을 말풍선으로 편다. 상세의 InfoTip 과 같은 이유로 터치는 탭으로 연다(ui/tooltip).
// 말풍선은 글자 줄이 아니라 두 칸 표다(같은 날 사용자 "이쁘게 정렬") — 스토어는 왼쪽, 값은 오른쪽 끝에 자릿수를 맞춰 선다.
import { useTooltip } from "@/components/ui/tooltip";
import { cn } from "@/lib/cn";
import { WISHLIST_MESSAGES as M } from "@/lib/wishlist/messages";

/** 싼 순서로 온다. 첫 줄이 그 기기의 대표 값(카드 줄에 적힌 값)이다 */
export type StoreMoreRow = { store: string; price: string; lowest: boolean };

export function StoreMore({ device, rows }: { device: string; rows: StoreMoreRow[] }) {
  const label = [M.storesHead(device), ...rows.map((r) => `${r.store} ${r.price}${r.lowest ? ` (${M.storeLowest})` : ""}`)].join("\n");
  const table = (
    <span className="flex min-w-[168px] flex-col gap-1.5 py-0.5">
      <span className="text-[11px] font-semibold opacity-70">{M.storesHead(device)}</span>
      <span className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-5 gap-y-1">
        {rows.map((r) => (
          <span key={r.store} className="contents">
            <span className={cn("flex items-center gap-1.5 truncate", r.lowest ? "font-bold" : "opacity-85")}>
              {r.store}
              {r.lowest && <span className="rounded-full bg-acc px-1.5 text-[10.5px] font-bold leading-[16px]">{M.storeLowest}</span>}
            </span>
            <span className={cn("text-right tabular-nums", r.lowest ? "font-bold" : "opacity-85")}>{r.price}</span>
          </span>
        ))}
      </span>
    </span>
  );
  const { triggerProps, tooltip } = useTooltip<HTMLButtonElement>(label, true, "tap", table);
  return (
    <>
      <button
        type="button"
        // 스크린리더에는 말풍선 대신 글자를 그대로 준다 — 말풍선은 시각 처리라 aria-hidden 이다
        aria-label={label}
        className="press shrink-0 rounded-full bg-surface-2 px-1.5 text-[11px] font-bold leading-[18px] text-mut transition-colors duration-base hover:bg-acc-soft hover:text-acc"
        {...triggerProps}
      >
        +{rows.length - 1}
      </button>
      {tooltip}
    </>
  );
}
