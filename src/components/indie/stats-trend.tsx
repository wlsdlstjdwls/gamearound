"use client";
// 내 게임 통계 맨 위 추이 그래프(2026-10-28, 사용자: "통계도 이쁘게 그래프로, 가시성을 높여"). 내 게임 모두의 30일 날짜별 합.
//
// 한 판에 숫자 하나만 그린다 — 조회는 수백, 찜과 댓글은 한 자릿수라 한 축에 같이 세우면 작은 쪽이 바닥에 깔린다.
// 위 칸(조회, 플레이하기 클릭, 새 찜, 댓글)이 곧 고르는 탭이다: 누르면 그 숫자의 선으로 바뀐다(누른 즉시, 상태는 이 안에만).
// 선과 면은 SVG 한 장(viewBox 를 늘려 폭을 채운다, 선 굵기는 non-scaling-stroke 로 지킨다). 가리킨 날의 점과 말풍선은
// 퍼센트 자리에 놓은 HTML 이다 — SVG 를 늘리면 원과 글자가 찌그러진다.
// 화면 읽기 프로그램에는 같은 값을 숨은 표로 준다(daily-bars 와 같은 방식).
import { useState } from "react";
import { cn } from "@/lib/cn";
import type { IndieStatsDay } from "@/lib/indie/dto";

type Metric = "views" | "plays" | "likes" | "comments";

const W = 600;
const H = 160;
/** 꼭대기 여백 — 가장 높은 날의 점이 판 끝에 붙지 않게 */
const HEADROOM = 1.15;

const fmt = (n: number) => n.toLocaleString("ko-KR");
/** "2026-10-27" 를 "10월 27일" 로. 문자열을 자른다 — Date 로 바꾸면 시간대에 따라 하루 밀린다 */
const dayLabel = (d: string) => `${Number(d.slice(5, 7))}월 ${Number(d.slice(8, 10))}일`;

export function StatsTrend({ days, metrics, title }: { days: IndieStatsDay[]; metrics: Array<{ key: Metric; label: string; total: number }>; title: string }) {
  const [metric, setMetric] = useState<Metric>("views");
  const [hover, setHover] = useState<number | null>(null);
  const values = days.map((d) => d[metric]);
  const max = Math.max(1, ...values) * HEADROOM;
  const n = Math.max(values.length - 1, 1);
  const x = (i: number) => (i / n) * W;
  const y = (v: number) => H - (v / max) * H;
  const line = values.map((v, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const area = `${line} L${W},${H} L0,${H} Z`;
  const shown = hover === null ? null : days[hover];
  const current = metrics.find((m) => m.key === metric);
  const mid = Math.floor((days.length - 1) / 2);

  return (
    <section aria-label={title} className="flex flex-col gap-4 rounded-[var(--radius-panel)] bg-surface p-4 shadow-hair sm:p-5">
      {/* 숫자 칸이 곧 탭이다. 고른 칸은 브랜드색 면 + 위쪽 띠 */}
      <div role="tablist" aria-label={title} className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {metrics.map((m) => {
          const on = m.key === metric;
          return (
            <button
              key={m.key}
              type="button"
              role="tab"
              aria-selected={on}
              onClick={() => {
                setMetric(m.key);
                setHover(null);
              }}
              className={cn(
                "press tap flex flex-col items-start gap-0.5 rounded-[var(--radius-md)] px-3.5 py-3 text-left transition-colors",
                on ? "bg-acc-soft [box-shadow:inset_0_3px_0_var(--acc),inset_0_0_0_1px_var(--acc-3)]" : "bg-surface-2 hover:bg-surface-3",
              )}
            >
              <span className={cn("text-[12.5px] font-semibold", on ? "text-acc" : "text-dim")}>{m.label}</span>
              <span className="text-[22px] font-black tabular-nums text-ink sm:text-[26px]">{fmt(m.total)}</span>
            </button>
          );
        })}
      </div>

      <figure className="flex flex-col gap-2">
        <figcaption className="flex items-baseline justify-between gap-3 text-[13px]">
          <span className="font-bold text-ink">{current?.label}</span>
          <span aria-live="polite" className="tabular-nums text-mut">
            {shown ? `${dayLabel(shown.day)} | ${fmt(shown[metric])}` : days[0] ? `${dayLabel(days[0].day)} ~ ${dayLabel(days[days.length - 1].day)}` : ""}
          </span>
        </figcaption>
        <div aria-hidden className="relative h-[160px] touch-pan-y" onPointerLeave={() => setHover(null)}>
          {/* 가로 기준선 셋(바닥, 가운데, 꼭대기) — 값 글자는 꼭대기에만 */}
          {[0, 0.5, 1].map((t) => (
            <span key={t} className="absolute inset-x-0 border-t border-dashed border-line-soft" style={{ top: `${t * 100}%` }} />
          ))}
          <span className="absolute left-0 top-1 text-[11px] tabular-nums text-dim">{fmt(Math.round(max / HEADROOM))}</span>
          <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="absolute inset-0 size-full overflow-visible">
            <defs>
              <linearGradient id="stats-trend-fill" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="var(--acc)" stopOpacity="0.28" />
                <stop offset="100%" stopColor="var(--acc)" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path key={`a-${metric}`} d={area} fill="url(#stats-trend-fill)" className="trend-fade" />
            <path key={`l-${metric}`} d={line} fill="none" stroke="var(--acc)" strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" pathLength={1} className="trend-draw" />
          </svg>
          {/* 날짜 칸마다 보이지 않는 기둥 — 가리키거나 누르면 그날 값 */}
          <div className="absolute inset-0 flex">
            {days.map((d, i) => (
              <span key={d.day} className="h-full flex-1" onPointerEnter={() => setHover(i)} onPointerDown={() => setHover(i)} />
            ))}
          </div>
          {shown && hover !== null && (
            <>
              <span className="pointer-events-none absolute inset-y-0 border-l border-acc/40" style={{ left: `${(hover / n) * 100}%` }} />
              <span
                className="pointer-events-none absolute size-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-acc ring-[3px] ring-surface"
                style={{ left: `${(hover / n) * 100}%`, top: `${(y(shown[metric]) / H) * 100}%` }}
              />
            </>
          )}
        </div>
        <div aria-hidden className="flex justify-between text-[11.5px] tabular-nums text-dim">
          <span>{days[0] && dayLabel(days[0].day)}</span>
          <span>{days[mid] && dayLabel(days[mid].day)}</span>
          <span>{days.at(-1) && dayLabel(days.at(-1)!.day)}</span>
        </div>
        <table className="sr-only">
          <caption>{current?.label}</caption>
          <tbody>
            {days.map((d) => (
              <tr key={d.day}>
                <th scope="row">{dayLabel(d.day)}</th>
                <td>{fmt(d[metric])}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </figure>
    </section>
  );
}

/** 줄마다의 작은 추이 선(30일 조회). 값이 하나도 없으면 바닥 선만 */
export function Sparkline({ values, label }: { values: number[]; label: string }) {
  const max = Math.max(1, ...values) * HEADROOM;
  const n = Math.max(values.length - 1, 1);
  const pts = values.map((v, i) => `${((i / n) * 100).toFixed(2)},${(30 - (v / max) * 30).toFixed(2)}`).join(" ");
  return (
    <svg viewBox="0 0 100 30" preserveAspectRatio="none" role="img" aria-label={label} className="h-9 w-full overflow-visible">
      <polyline points={`0,30 ${pts} 100,30`} fill="var(--acc-soft)" stroke="none" />
      <polyline points={pts} fill="none" stroke="var(--acc)" strokeWidth={1.75} vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
    </svg>
  );
}
