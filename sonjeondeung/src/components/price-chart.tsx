"use client";
// 가격 이력 차트 — recharts LineChart. 플랫폼별 라인(색은 플랫폼 고정 매핑), KRW 단일 축, 툴팁 formatKrw
import { useMemo } from "react";
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { TooltipContentProps } from "recharts";
import { formatDate, formatKrw, PLATFORM_LABEL } from "@/lib/format";
import type { Platform } from "@/server/db/schema";
import type { PriceSeries } from "@/server/services/prices";

// 플랫폼 → 색 고정(엔티티 기준, 순서/개수와 무관). 다크 서피스 기준 검증된 6색
const PLATFORM_COLOR: Record<Platform, string> = {
  steam: "#3987e5",
  ps5: "#d95926",
  ps4: "#199e70",
  xbox: "#c98500",
  switch: "#d55181",
  switch2: "#008300",
};

type MergedPoint = { t: number } & Partial<Record<Platform, number>>;

/** 플랫폼별 시계열을 시각(t) 기준 한 배열로 병합. 같은 시각이 없는 플랫폼은 undefined → connectNulls 로 이음 */
function merge(series: PriceSeries[]): MergedPoint[] {
  const byT = new Map<number, MergedPoint>();
  for (const s of series) {
    for (const p of s.points) {
      const t = new Date(p.t).getTime();
      const row = byT.get(t) ?? { t };
      row[s.platform] = p.price;
      byT.set(t, row);
    }
  }
  return [...byT.values()].sort((a, b) => a.t - b.t);
}

function PriceTooltip({ active, payload, label }: TooltipContentProps) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="rounded-md border border-slate-700 bg-slate-900/95 px-3 py-2 text-xs shadow-lg">
      <p className="mb-1 text-slate-400">{formatDate(new Date(Number(label)))}</p>
      <ul className="space-y-0.5">
        {payload.map((e) => (
          <li key={String(e.dataKey)} className="flex items-center gap-2">
            <span aria-hidden className="inline-block h-2 w-2 rounded-full" style={{ background: e.color }} />
            <span className="text-slate-300">{PLATFORM_LABEL[String(e.dataKey)] ?? String(e.dataKey)}</span>
            <span className="ml-auto font-semibold text-slate-100">{formatKrw(typeof e.value === "number" ? e.value : null)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function PriceChart({ series }: { series: PriceSeries[] }) {
  const data = useMemo(() => merge(series), [series]);
  const platforms = series.map((s) => s.platform);

  return (
    <div className="h-72 w-full sm:h-96" role="img" aria-label="플랫폼별 가격 변동 그래프">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 12, bottom: 4, left: 8 }}>
          <CartesianGrid stroke="#1e293b" vertical={false} />
          <XAxis
            dataKey="t"
            type="number"
            scale="time"
            domain={["dataMin", "dataMax"]}
            tickFormatter={(v: number) => formatDate(new Date(v))}
            stroke="#475569"
            tick={{ fill: "#94a3b8", fontSize: 11 }}
            minTickGap={40}
          />
          <YAxis
            tickFormatter={(v: number) => formatKrw(v)}
            stroke="#475569"
            tick={{ fill: "#94a3b8", fontSize: 11 }}
            width={80}
            domain={[0, "auto"]}
          />
          <Tooltip content={PriceTooltip} cursor={{ stroke: "#64748b", strokeDasharray: "3 3" }} />
          {platforms.length > 1 && (
            <Legend formatter={(v: string) => <span className="text-xs text-slate-300">{PLATFORM_LABEL[v] ?? v}</span>} />
          )}
          {platforms.map((p) => (
            <Line
              key={p}
              type="stepAfter"
              dataKey={p}
              name={p}
              stroke={PLATFORM_COLOR[p]}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
              connectNulls
              isAnimationActive={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
