"use client";
// 출시예정의 달 탭 띠 — 머리띠 아래 붙어 서서 "어느 달이 있고, 지금 어디를 읽나" 를 말한다.
//
// 칩 줄에서 탭 띠로 바꾼 이유(2026-10-06, 사용자 지적: "상단에 날짜 나열만 되어있어서 불편",
// "가독성이랑 가시성이 떨어진다"). 옛 띠를 재어 보면 이유가 셋이었다:
//   1) 글자가 작고 옅었다. 달 12.5px, 건수 11.5px 회색, 연도는 11px 에 --dim-2(흰 판 대비 3.0:1)라
//      띠가 "누를 것" 이 아니라 각주처럼 읽혔다. 달을 15px 굵게, 건수를 그 아래 한 줄로 내렸다.
//   2) 지금 어느 달을 보고 있는지 띠가 말하지 않았다. 모든 칩이 같은 회색이라 스크롤하는 동안
//      띠는 그냥 날짜 나열이었다. 읽고 있는 달을 브랜드 보라 면으로 켠다(고른 칩과 같은 말, chip.tsx).
//   3) 연도 경계가 칩 사이 글자 하나로만 보였다. 연도를 진한 글자로 세우고 새 해 앞에 세로 선을 긋는다.
//
// 2026-10-07: 띠가 닻이 아니라 **달을 고르는 탭**이 됐다(사용자 지적: "한 화면에 모든 달의 게임을 뿌리는게 문제").
// 누르면 같은 화면이 그 달만 다시 세운다(?month=). 고른 탭은 응답을 기다리지 않고 바로 켠다 —
// 서버가 그 달을 그리는 동안 옛 탭이 켜져 있으면 "눌렀는데 안 먹었다" 로 읽힌다.
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/cn";
import { byYear, upcomingMonthHref } from "@/lib/games/upcoming";

export function UpcomingMonthNav({ months, activeKey }: { months: { key: string; total: number }[]; activeKey: string }) {
  const [picked, setPicked] = useState(activeKey);
  const [prevActive, setPrevActive] = useState(activeKey);
  const navRef = useRef<HTMLElement>(null);
  const firstKey = months[0]?.key;

  // 서버가 다른 달을 세웠으면(뒤로가기, 주소 직접 입력) 그쪽을 따른다 — effect 가 아니라 렌더에서 맞춘다
  if (activeKey !== prevActive) {
    setPrevActive(activeKey);
    setPicked(activeKey);
  }

  // 켜진 탭이 띠 밖으로 밀려 있으면 띠만 가로로 민다. scrollIntoView 는 문서까지 세로로 움직여서 쓰지 않는다
  useEffect(() => {
    const nav = navRef.current;
    const tab = nav?.querySelector<HTMLElement>('[aria-current="page"]');
    if (!nav || !tab) return;
    const left = tab.offsetLeft - nav.offsetLeft;
    if (left < nav.scrollLeft || left + tab.offsetWidth > nav.scrollLeft + nav.clientWidth) {
      nav.scrollTo({ left: left - nav.clientWidth / 2 + tab.offsetWidth / 2, behavior: "smooth" });
    }
  }, [picked]);

  return (
    <nav
      ref={navRef}
      aria-label="달 고르기"
      className="sticky top-[var(--header-h)] z-20 -mx-5 flex h-[var(--month-nav-h)] items-center gap-3 overflow-x-auto border-b border-line bg-bg/95 px-5 backdrop-blur [scrollbar-width:none] sm:-mx-7 sm:px-7"
    >
      {byYear(months).map((group, gi) => (
        <div key={group.year} className={cn("flex shrink-0 items-center gap-1.5", gi > 0 && "border-l border-line-strong pl-3")}>
          {/* 연도는 누르는 것이 아니라 묶음 이름표다. 옅게 두면 경계가 안 보여서 진한 글자로 세운다 */}
          <span className="mr-0.5 shrink-0 text-[13px] font-bold text-ink-2 tabular-nums">{group.year}</span>
          {group.months.map((m) => {
            const on = m.key === picked;
            return (
              <Link
                key={m.key}
                href={upcomingMonthHref(m.key, firstKey)}
                aria-current={on ? "page" : undefined}
                onClick={() => setPicked(m.key)}
                className={cn(
                  "press tap flex min-w-[56px] shrink-0 flex-col items-center justify-center rounded-xl px-3 py-1 leading-tight transition-colors duration-base",
                  // 두 상태 모두 테두리 1px 을 둘러야 켜고 끌 때 높이가 안 어긋난다
                  on ? "border border-acc bg-acc text-on-ink hover:bg-acc-hover" : "border border-line bg-surface text-ink hover:bg-surface-2",
                )}
              >
                <span className="text-[15px] font-bold">{m.month}</span>
                {/* 건수는 달 아래 한 단 물러난다 — 고르는 값은 달이고 숫자는 그 달의 크기다 */}
                <span className={cn("text-[11.5px] font-medium tabular-nums", on ? "text-on-ink/80" : "text-mut")}>
                  {m.total.toLocaleString("ko-KR")}개
                </span>
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}
