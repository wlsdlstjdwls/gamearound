"use client";
// 출시 예정 좁은 화면의 달 고르기 — 이전 달 | 가운데 달 이름(누르면 달 목록 시트) | 다음 달.
//
// 왜 칩 줄을 걷었나(2026-11-20 사용자 "음 여전히 날짜 선택이 불편한디", 고른 안 = 이전/다음 달 단추):
// 390 폭에서 달 칩 줄은 두세 달만 보이고 나머지는 옆으로 밀어야 보였다. 달은 차례가 있는 값이라 한 칸씩 넘기는 것이 자연스럽고,
// 멀리 갈 때는 가운데 이름을 눌러 시트에서 한 번에 고른다. 명예의 전당 month-stepper 와 같은 문법이다(양 끝 단추는 ui/step-arrow 공용).
//
// 전체 보기에서는 가운데가 "전체 출시 예정 N개", 왼쪽은 막힌 칸, 오른쪽은 월별 보기의 첫 달로 가는 단추다 —
// 전체 보기는 달 차례의 바깥(맨 앞)이라 "다음" 이 첫 달이다. 시트 맨 위 "전체" 가 그 반대 길이다.
//
// 누른 순간 반응(AGENTS 6장): 양 끝 단추와 시트 칸이 모두 같은 무리(GROUP)로 가서, 가운데 이름이 useNavPicked 로 고른 달을 먼저 그린다.
import { useState } from "react";
import Link from "next/link";
import { ChevronDownIcon } from "@/components/ui/icons";
import { useNavGroupGo, useNavPicked } from "@/components/ui/nav-pending";
import { Sheet } from "@/components/ui/sheet";
import { StepArrow } from "@/components/ui/step-arrow";
import { isPlainClick } from "@/components/ui/chip-nav";
import { cn } from "@/lib/cn";
import { formatMonthLabel } from "@/lib/format";
import { byYear } from "@/lib/games/upcoming";
import { UPCOMING_MESSAGES as M, upcomingCountText } from "@/lib/games/messages";

/** 이 스테퍼의 이동 무리. 고른 주소가 이 무리로 잡혀야 가운데 이름이 먼저 바뀐다 */
const GROUP = "upcoming-month";

type Month = { key: string; total: number };

export function UpcomingMonthStepper({
  months,
  current,
  all,
  hrefOf,
  allHref,
}: {
  months: readonly Month[];
  /** 지금 서버가 세운 달 열쇠. 전체 보기면 무시한다 */
  current: string;
  all: boolean;
  hrefOf: (key: string) => string;
  allHref: string;
}) {
  const [open, setOpen] = useState(false);
  const picked = useNavPicked(GROUP);
  const navGo = useNavGroupGo(GROUP);
  // 고른 주소가 있으면 그쪽을 먼저 그린다(서버가 새 달을 그리는 동안)
  const pickedAll = picked === allHref;
  const pickedKey = picked ? months.find((m) => hrefOf(m.key) === picked)?.key : undefined;
  const showAll = pickedAll || (!pickedKey && all);
  const shownKey = pickedKey ?? current;
  const i = months.findIndex((m) => m.key === shownKey);
  const shown = months[i];
  const total = months.reduce((n, m) => n + m.total, 0);

  const prevHref = showAll ? undefined : i > 0 ? hrefOf(months[i - 1].key) : undefined;
  const nextHref = showAll ? (months[0] ? hrefOf(months[0].key) : undefined) : i >= 0 && i < months.length - 1 ? hrefOf(months[i + 1].key) : undefined;
  const centerText = showAll ? M.monthAllCenter : shown ? formatMonthLabel(shown.key) : "";
  const centerCount = showAll ? total : (shown?.total ?? 0);

  /** 시트 칸을 누르면 닫고 같은 무리로 간다. 틀 밖이거나 새 탭 클릭이면 링크 그대로 둔다 */
  const pick = (href: string) => (e: React.MouseEvent) => {
    if (!navGo || !isPlainClick(e)) return;
    e.preventDefault();
    setOpen(false);
    navGo(href);
  };

  return (
    <div role="group" aria-label={M.monthSheetTitle} className="flex w-full items-center justify-between gap-1">
      <StepArrow dir="prev" group={GROUP} href={prevHref} label={M.monthPrev} />
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={M.monthSheetOpen(`${centerText} ${upcomingCountText(centerCount)}`)}
        aria-haspopup="dialog"
        className="press tap-inset flex h-10 min-w-0 items-center gap-1.5 rounded-full px-3 transition-colors duration-fast hover:bg-surface-2"
      >
        <span aria-live="polite" className="truncate text-[16px] font-extrabold tabular-nums tracking-[-0.02em] text-ink">
          {centerText}
        </span>
        <span className="shrink-0 text-[12.5px] font-medium tabular-nums text-dim">{upcomingCountText(centerCount)}</span>
        <ChevronDownIcon size={15} className="shrink-0 text-mut" />
      </button>
      <StepArrow dir="next" group={GROUP} href={nextHref} label={showAll ? M.monthFirst : M.monthNext} />

      <Sheet title={M.monthSheetTitle} open={open} onOpenChange={setOpen}>
        <div className="flex flex-col gap-4 pb-2">
          <Link
            href={allHref}
            scroll={false}
            onClick={pick(allHref)}
            aria-current={showAll ? "page" : undefined}
            className={cn(cellClass(showAll, "row"), "h-12 w-full")}
          >
            <span className="text-[15px] font-bold">{M.monthAllCenter}</span>
            <span className={countClass(showAll)}>{upcomingCountText(total)}</span>
          </Link>
          {byYear([...months]).map((g) => (
            <section key={g.year} aria-label={`${g.year}년`} className="flex flex-col gap-2">
              <h3 className="text-[13px] font-bold tabular-nums text-dim">{g.year}년</h3>
              <ul className="grid grid-cols-3 gap-2">
                {g.months.map((m) => {
                  const on = !showAll && m.key === shownKey;
                  const href = hrefOf(m.key);
                  return (
                    <li key={m.key}>
                      <Link href={href} scroll={false} onClick={pick(href)} aria-current={on ? "page" : undefined} className={cn(cellClass(on, "col"), "h-14 w-full")}>
                        <span className="text-[15px] font-bold">{m.month}</span>
                        <span className={countClass(on)}>{upcomingCountText(m.total)}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      </Sheet>
    </div>
  );
}

/** 시트 칸 — 고른 칸은 옅은 파랑 면 + 파랑 글자(넓은 화면 달 칩, 바닥 탭바의 켜진 칸과 같은 말). 나머지는 회색 면 */
function cellClass(on: boolean, dir: "row" | "col"): string {
  return cn(
    // 방향을 인자로 받는 이유: cn 은 겹친 클래스를 지우지 않아 flex-col 위에 flex-row 를 덧대면 CSS 순서 싸움이 된다
    "press flex items-center justify-center rounded-xl transition-colors duration-fast",
    dir === "row" ? "flex-row gap-2" : "flex-col gap-0.5",
    on ? "bg-acc-soft text-acc" : "bg-surface-2 text-ink hover:bg-surface-3",
  );
}

function countClass(on: boolean): string {
  return cn("text-[12px] font-medium tabular-nums", on ? "text-acc/80" : "text-dim");
}
