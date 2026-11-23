"use client";
// 가격 그래프의 말풍선 — chart.tsx 가 300줄을 넘어 떼어 냈다(2026-11-19). 날짜 한 줄, 계열마다 이름과 값 한 줄
import { formatPrice } from "@/lib/currency";
import type { TooltipContentProps } from "recharts";
import { formatDate } from "@/lib/format";
import type { Currency, Platform } from "@/server/db/schema";
import { seriesLabel, type MergedPoint } from "@/components/price-chart/prepare";

/** 행사 이름을 모르는 할인(스토어가 이름을 안 준다) */
const SALE_FALLBACK = "할인";

export function PriceTooltip({ active, payload, label, currency }: TooltipContentProps & { currency: Currency }) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="rounded-[7px] border border-line-strong bg-surface px-3 py-2 text-[11.5px] max-sm:text-[12.5px]">
      <p className="mb-1 text-dim">{formatDate(new Date(Number(label)))}</p>
      <ul className="space-y-0.5">
        {payload.map((e) => {
          const platform = String(e.dataKey) as Platform;
          // 그 시각 할인 중이었으면 값 밑에 할인율과 행사 이름(2026-11-23 사용자 "무슨 세일이었는지도"). 할인율은 빨강 — 가격 카드의 할인율과 같은 색이다
          const sale = (e.payload as MergedPoint | undefined)?.sales?.[platform];
          return (
            <li key={platform} className="flex flex-col">
              <span className="flex items-center gap-2">
                <span aria-hidden className="inline-block h-2 w-2 rounded-full" style={{ background: e.color }} />
                <span className="text-mut">{seriesLabel(platform)}</span>
                <span className="ml-auto font-semibold text-ink">{formatPrice(typeof e.value === "number" ? e.value : null, currency)}</span>
              </span>
              {sale && (
                <span className="pl-4 text-dim">
                  <b className="font-bold text-danger">-{sale.pct}%</b> {sale.name ?? SALE_FALLBACK}
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
