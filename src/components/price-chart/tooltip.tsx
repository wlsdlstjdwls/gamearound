"use client";
// 가격 그래프의 말풍선 — chart.tsx 가 300줄을 넘어 떼어 냈다(2026-11-19). 날짜 한 줄, 계열마다 이름과 값 한 줄
import { formatPrice } from "@/lib/currency";
import type { TooltipContentProps } from "recharts";
import { formatDate } from "@/lib/format";
import type { Currency, Platform } from "@/server/db/schema";
import { seriesLabel } from "@/components/price-chart/prepare";

export function PriceTooltip({ active, payload, label, currency }: TooltipContentProps & { currency: Currency }) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="rounded-[7px] border border-line-strong bg-surface px-3 py-2 text-[11.5px]">
      <p className="mb-1 text-dim">{formatDate(new Date(Number(label)))}</p>
      <ul className="space-y-0.5">
        {payload.map((e) => (
          <li key={String(e.dataKey)} className="flex items-center gap-2">
            <span aria-hidden className="inline-block h-2 w-2 rounded-full" style={{ background: e.color }} />
            <span className="text-mut">{seriesLabel(String(e.dataKey) as Platform)}</span>
            <span className="ml-auto font-semibold text-ink">{formatPrice(typeof e.value === "number" ? e.value : null, currency)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
