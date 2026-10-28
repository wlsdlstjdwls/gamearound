"use client";
// 게임별로 견주기(2026-10-28, 사용자 "그래프 더, 가시성이 중요"). 내 게임이 둘 이상일 때 30일 반응을 게임마다 가로 막대로 세운다.
//
// 막대 하나에 숫자 하나 — 위 칸(조회, 플레이하기 클릭, 새 찜, 댓글)을 누르면 그 숫자로 바뀐다(누른 즉시, 상태는 이 안에만).
// 항목을 한 축에 섞지 않는 이유는 stats-trend 와 같다: 조회는 수백, 찜은 한 자릿수라 작은 쪽이 바닥에 깔린다.
// 색은 한 가지(--acc)다 — 막대는 게임이라는 같은 갈래의 크기를 말할 뿐이라 갈래 색이 필요 없다. 가장 큰 막대만 진하게 해 눈이 먼저 간다.
// 값은 막대 끝에 늘 글자로 선다(막대 길이만으로 말하지 않는다). 순서는 큰 값부터.
import { useState } from "react";
import type { CSSProperties } from "react";
import { cn } from "@/lib/cn";
import { stagger } from "@/lib/motion";
import type { IndieStatsTotals } from "@/lib/indie/dto";

type Metric = "views" | "plays" | "likes" | "comments";

/** 값이 있는 막대가 너무 짧아 안 보이지 않게 남기는 최소 폭(%) */
const MIN_BAR_PCT = 3;

const fmt = (n: number) => n.toLocaleString("ko-KR");

export function GameCompare({
  title,
  lead,
  empty,
  metrics,
  games,
}: {
  title: string;
  lead: string;
  empty: string;
  metrics: Array<{ key: Metric; label: string }>;
  games: Array<{ id: string; title: string; window: IndieStatsTotals }>;
}) {
  const [metric, setMetric] = useState<Metric>("views");
  const sorted = [...games].sort((a, b) => b.window[metric] - a.window[metric]);
  const max = Math.max(0, ...sorted.map((g) => g.window[metric]));

  return (
    <section aria-label={title} className="flex flex-col gap-4 rounded-[var(--radius-panel)] bg-surface p-4 shadow-hair sm:p-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <h2 className="text-[15px] font-bold text-ink">{title}</h2>
          <p className="text-[12.5px] text-dim">{lead}</p>
        </div>
        {/* 고르는 칸 — 하나만 켜진다. 좁은 화면에서는 옆으로 민다(줄을 늘리지 않는다) */}
        <div role="tablist" aria-label={title} className="-mx-1 flex max-w-full gap-1 overflow-x-auto px-1 [scrollbar-width:none]">
          {metrics.map((m) => {
            const on = m.key === metric;
            return (
              <button
                key={m.key}
                type="button"
                role="tab"
                aria-selected={on}
                onClick={() => setMetric(m.key)}
                className={cn(
                  "press tap shrink-0 rounded-full px-3 py-1.5 text-[12.5px] font-semibold transition-colors",
                  on ? "bg-acc text-white" : "bg-surface-2 text-ink-2 hover:bg-surface-3",
                )}
              >
                {m.label}
              </button>
            );
          })}
        </div>
      </div>

      {max === 0 ? (
        <p className="rounded-xl bg-surface-2 px-4 py-3 text-[13px] text-mut">{empty}</p>
      ) : (
        <ul key={metric} className="flex flex-col gap-2.5">
          {sorted.map((g, i) => {
            const v = g.window[metric];
            const pct = v === 0 ? 0 : Math.max(MIN_BAR_PCT, (v / max) * 100);
            return (
              <li key={g.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 sm:grid-cols-[minmax(0,180px)_minmax(0,1fr)_64px]">
                <span className="truncate text-[13.5px] text-ink">{g.title}</span>
                <span className="col-span-2 row-start-2 h-3 overflow-hidden rounded-r-[4px] bg-surface-2 sm:col-span-1 sm:row-start-auto">
                  {v > 0 && <span className={cn("bar-grow block h-full rounded-r-[4px]", i === 0 ? "bg-acc" : "bg-acc/55")} style={{ "--bar-w": `${pct}%`, ...stagger(i) } as CSSProperties} />}
                </span>
                <span className="col-start-2 row-start-1 text-right text-[13px] font-bold tabular-nums text-ink sm:col-start-auto sm:row-start-auto">{fmt(v)}</span>
              </li>
            );
          })}
        </ul>
      )}
      {/* 화면 읽기 프로그램에는 같은 값을 표로 준다 */}
      <table className="sr-only">
        <caption>{title}</caption>
        <thead>
          <tr>
            <th scope="col">{title}</th>
            {metrics.map((m) => (
              <th key={m.key} scope="col">
                {m.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {games.map((g) => (
            <tr key={g.id}>
              <th scope="row">{g.title}</th>
              {metrics.map((m) => (
                <td key={m.key}>{fmt(g.window[m.key])}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
