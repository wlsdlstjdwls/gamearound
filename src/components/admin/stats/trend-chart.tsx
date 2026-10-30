"use client";
// 날짜별 추이 그래프 하나(2026-10-30) — 매출현황, 이용현황, 대시보드가 같이 쓴다.
//
// 그래프 하나에 계열 하나다. 금액과 건수처럼 단위가 다른 값은 축 둘을 겹치지 않고 그래프를 나눈다(dataviz: 이중 축 금지).
// 색은 브랜드 파랑 하나 — 계열이 하나라 범례를 두지 않고 제목이 이름이다. 막대는 끝만 둥글게(4px), 격자와 축은 흐리게.
// 모든 막대에 숫자를 달지 않는다. 올리면 그날 값이 말풍선으로 뜬다(hover). 색은 globals.css 토큰을 읽는다(use-css-tokens 머리 주석).
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { TooltipContentProps } from "recharts";
import { useCssTokens } from "@/components/use-css-tokens";

const TOKENS = ["--acc", "--line", "--line-soft", "--dim", "--surface-2"] as const;
/** 막대 끝 둥글기(px). 위 두 귀만 — 바닥선에 붙은 쪽은 각지게 둔다 */
const BAR_RADIUS: [number, number, number, number] = [4, 4, 0, 0];
/** 막대가 너무 굵으면 기간이 짧을 때 덩어리로 보인다 */
const BAR_MAX = 28;
const AXIS_FONT = 11;
/** 날짜 칸 사이 최소 간격(px). 30일이면 몇 칸 건너 하나씩 선다 */
const TICK_GAP = 24;

export type TrendPoint = { day: string; value: number };

/** "2026-10-30" 을 "10.30" 으로. 축에 연도까지 적으면 칸이 좁아 겹친다 */
const short = (day: string) => `${Number(day.slice(5, 7))}.${Number(day.slice(8, 10))}`;

function Tip({ active, payload, format }: TooltipContentProps & { format: (n: number) => string }) {
  const p = active ? (payload?.[0]?.payload as TrendPoint | undefined) : undefined;
  if (!p) return null;
  return (
    <div className="rounded-lg bg-surface px-2.5 py-1.5 text-[12px] shadow-[var(--elev-card)]">
      <p className="text-dim">{p.day}</p>
      <p className="font-bold tabular-nums text-ink">{format(p.value)}</p>
    </div>
  );
}

export function TrendChart({ title, data, format, axisFormat, height = 180 }: { title: string; data: TrendPoint[]; format: (n: number) => string; axisFormat?: (n: number) => string; height?: number }) {
  const t = useCssTokens(TOKENS);
  return (
    <figure className="flex min-w-0 flex-col gap-1.5">
      <figcaption className="px-1 text-[12.5px] font-bold text-ink">{title}</figcaption>
      {/* 그림은 낭독기가 못 읽는다 — 같은 값은 화면의 일별 표가 준다. 그림에는 이름만 붙인다 */}
      <div role="img" aria-label={title} style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 6, right: 6, bottom: 0, left: 0 }} barCategoryGap="20%">
            <CartesianGrid stroke={t["--line-soft"]} vertical={false} />
            <XAxis dataKey="day" tickFormatter={short} stroke={t["--line"]} tick={{ fill: t["--dim"], fontSize: AXIS_FONT }} tickLine={false} minTickGap={TICK_GAP} />
            <YAxis tickFormatter={axisFormat ?? ((n: number) => n.toLocaleString("ko-KR"))} stroke={t["--line"]} tick={{ fill: t["--dim"], fontSize: AXIS_FONT }} tickLine={false} axisLine={false} width={56} allowDecimals={false} />
            <Tooltip content={(props: TooltipContentProps) => <Tip {...props} format={format} />} cursor={{ fill: t["--surface-2"] }} />
            <Bar dataKey="value" fill={t["--acc"]} radius={BAR_RADIUS} maxBarSize={BAR_MAX} isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </figure>
  );
}
