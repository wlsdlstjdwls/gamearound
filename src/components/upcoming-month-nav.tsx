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
//
// 2026-10-27: 해를 한꺼번에 늘어놓지 않는다(사용자: "26년, 27년 다 보여 주는 UI 개선"). 두 해의 달 열몇 개가 한 띠에 서니
// 어디서 해가 바뀌는지 세로 선 하나로만 갈렸다. 이제 왼쪽에 해 고르기(두 해 이상일 때만 단추)가 서고, 띠에는 고른 해의 달만 선다.
// 해를 바꾸면 그 해의 첫 달로 간다 — 해만 바꾸고 달을 안 고르면 띠와 목록이 서로 다른 해를 말한다.

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/cn";
import { byYear, upcomingMonthHref, type UpcomingFilter } from "@/lib/games/upcoming";

export function UpcomingMonthNav({ months, activeKey, filter }: { months: { key: string; total: number }[]; activeKey: string; filter: UpcomingFilter }) {
  const [picked, setPicked] = useState(activeKey);
  const [prevActive, setPrevActive] = useState(activeKey);
  const navRef = useRef<HTMLElement>(null);
  const firstKey = months[0]?.key;
  const years = byYear(months);

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

  // 2026-11-20: 해 고르기를 걷고 달을 한 줄로 잇는다(사용자 "출시 예정화면 날짜 선택하는게 불편"). 해 단추와 달 칩이 두 단계로 갈려
  // 다음 해의 달을 보려면 해를 먼저 바꿔야 했고, 고른 달은 파랑 꽉 찬 큰 칸(52x43)으로 부풀어 띠에서 혼자 튀었다.
  // 이제 달 칩이 오늘부터 끝까지 이어 서고, 해가 바뀌는 첫 달 앞에만 작은 해 머리("2027년")가 선다 — 첫 해도 머리를 단다(어느 해인지 띠가 말한다).
  // 고른 달은 옅은 파랑 면 + 파랑 글자(바닥 탭바의 켜진 칸과 같은 말)로 절제한다. 건수는 달 옆 작은 회색 숫자다.
  // 이전/다음 단추(명예의 전당 month-stepper)도 그려 봤지만 출시 예정은 "어느 달에 몇 개가 있나" 를 한눈에 보는 게 일이라 한 줄이 낫다
  return (
    <nav
      ref={navRef}
      aria-label="달 고르기"
      className="sticky top-[var(--header-h)] z-20 -mx-5 flex h-[var(--month-nav-h)] items-center gap-1.5 overflow-x-auto border-b border-line bg-bg/95 px-5 backdrop-blur [scrollbar-width:none] sm:-mx-7 sm:px-7"
    >
      {years.map((g, i) => (
        // 둘째 해부터 앞 해와 조금 띄운다 — 해 머리가 앞 달 칩에 붙으면 그 달의 꼬리표로 읽힌다
        <div key={g.year} role="group" aria-label={`${g.year}년`} className={cn("flex shrink-0 items-center gap-1.5", i > 0 && "ml-2")}>
          <span aria-hidden className="shrink-0 pr-0.5 text-[12px] font-bold tabular-nums text-dim">
            {g.year}년
          </span>
          {g.months.map((m) => {
            const on = m.key === picked;
            return (
              <Link
                key={m.key}
                href={upcomingMonthHref(m.key, firstKey, filter)}
                aria-current={on ? "page" : undefined}
                aria-label={`${g.year}년 ${m.month} ${m.total.toLocaleString("ko-KR")}개`}
                onClick={() => setPicked(m.key)}
                className={cn(
                  "press tap-inset flex h-9 shrink-0 items-center gap-1 rounded-full px-3.5 leading-none transition-colors duration-base",
                  on ? "bg-acc-soft text-acc" : "text-ink-2 hover:bg-surface-2 hover:text-ink",
                )}
              >
                <span className={cn("text-[14.5px]", on ? "font-bold" : "font-semibold")}>{m.month}</span>
                {/* 건수는 달 옆 한 단 작게 — 고르는 값은 달이고 숫자는 그 달의 크기다 */}
                <span className={cn("text-[12px] font-medium tabular-nums", on ? "text-acc/80" : "text-dim")}>{m.total.toLocaleString("ko-KR")}</span>
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}
