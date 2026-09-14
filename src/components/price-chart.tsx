"use client";
// 가격 이력 차트 — recharts LineChart. 플랫폼별 라인(색은 플랫폼 고정 매핑), 단일 통화 축(sameCurrency)
// 표시 규칙(dekudeals 참고):
//  - 가격은 "바뀔 때만" 기록되므로 각 라인은 마지막 기록 → 지금까지 수평으로 이어 그린다(기록 1건이면 점이 아니라 선으로 보이게)
//  - 구간을 좁히면 구간 시작 시점의 가격을 앵커 포인트로 만들어 라인이 끊기지 않게 한다
//  - 플랫폼이 하나일 때만 정가 기준선, 역대 최저점, 진행 중 할인 구간을 함께 그린다(여러 개면 읽기 어려움)
import { formatPrice, sameCurrency } from "@/lib/currency";
import { useMemo, useState } from "react";
import {
  CartesianGrid,
  Label,
  Legend,
  Line,
  LineChart,
  ReferenceArea,
  ReferenceDot,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { TooltipContentProps } from "recharts";
import { formatDate, PLATFORM_LABEL } from "@/lib/format";
import type { Currency, Platform } from "@/server/db/schema";
import type { PriceSeries } from "@/server/services/prices";
import { useNow } from "@/components/use-now";
import { ChipButton } from "@/components/ui/chip";

// 플랫폼 → 색 고정(엔티티 기준, 순서/개수와 무관). 저채도 팔레트라 색상이 아니라 명도로 구분한다
const PLATFORM_COLOR: Record<Platform, string> = {
  steam: "#1C1C1A",
  ps5: "#6B6862",
  ps4: "#8C8A84",
  xbox: "#A8A59E",
  switch: "#C4C0B8",
  switch2: "#3A5A4A",
  epic: "#4A4A6B",
};
/** 가장 진한 선(=대표 플랫폼)만 2.5px, 나머지는 2px */
const PLATFORM_WIDTH: Record<Platform, number> = { steam: 2.5, ps5: 2, ps4: 2, xbox: 2, switch: 2, switch2: 2, epic: 2 };

/** 기간 선택 — days=null 은 전체 */
const RANGES: Array<{ key: string; label: string; days: number | null }> = [
  { key: "1y", label: "1년", days: 365 },
  { key: "6m", label: "6개월", days: 180 },
  { key: "3m", label: "3개월", days: 90 },
  { key: "all", label: "전체", days: null },
];
const DEFAULT_RANGE_KEY = "1y";
/** Y축 위쪽 여유 — 정가 기준선 라벨이 잘리지 않게 */
const Y_HEADROOM = 1.12;
/** X축 오른쪽 여유(구간 폭 대비) — 할인 종료선 라벨 자리 */
const X_HEADROOM = 0.18;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

type MergedPoint = { t: number } & Partial<Record<Platform, number>>;

type Prepared = {
  data: MergedPoint[];
  platforms: Platform[];
  /** 플랫폼이 하나일 때만 채워지는 보조 표시값 */
  single: { platform: Platform; listPrice: number | null; low: { t: number; price: number } | null; saleFrom: number | null; saleTo: number | null } | null;
};

/** 한 플랫폼의 시계열을 [구간 시작, ..., 지금] 으로 정규화 */
function clampSeries(s: PriceSeries, from: number | null, now: number): Array<{ t: number; price: number }> {
  const sorted = s.points
    .map((p) => ({ t: new Date(p.t).getTime(), price: p.price }))
    .filter((p) => Number.isFinite(p.t))
    .sort((a, b) => a.t - b.t);
  if (sorted.length === 0) return [];

  const out: Array<{ t: number; price: number }> = [];
  if (from !== null) {
    const prior = [...sorted].reverse().find((p) => p.t < from);
    if (prior) out.push({ t: from, price: prior.price }); // 구간 시작 앵커
    out.push(...sorted.filter((p) => p.t >= from));
  } else {
    out.push(...sorted);
  }
  if (out.length === 0) return [];

  // 마지막 기록 → 지금까지 수평 유지 (현재가가 있으면 그 값으로)
  const last = out[out.length - 1];
  const currentPrice = s.currentPrice ?? last.price;
  if (now > last.t) out.push({ t: now, price: currentPrice });
  return out;
}

function prepare(series: PriceSeries[], rangeDays: number | null, now: number): Prepared {
  const from = rangeDays === null ? null : now - rangeDays * MS_PER_DAY;
  const byT = new Map<number, MergedPoint>();
  const platforms: Platform[] = [];

  for (const s of series) {
    const points = clampSeries(s, from, now);
    if (points.length === 0) continue;
    platforms.push(s.platform);
    for (const p of points) {
      const row = byT.get(p.t) ?? { t: p.t };
      row[s.platform] = p.price;
      byT.set(p.t, row);
    }
  }

  const data = [...byT.values()].sort((a, b) => a.t - b.t);

  if (series.length === 1 && platforms.length === 1) {
    const s = series[0];
    const inRange = clampSeries(s, from, now);
    const low = inRange.reduce<{ t: number; price: number } | null>((acc, p) => (acc === null || p.price < acc.price ? p : acc), null);
    const onSale = (s.discountPct ?? 0) > 0;
    const saleTo = onSale && s.discountEndsAt ? new Date(s.discountEndsAt).getTime() : null;
    // 시작을 아는 소스(xbox)는 그 시각부터, 모르는 소스(steam)는 "지금부터 종료까지"만 음영 처리
    const saleFrom = onSale ? (s.discountStartsAt ? new Date(s.discountStartsAt).getTime() : now) : null;
    return { data, platforms, single: { platform: s.platform, listPrice: s.listPrice, low, saleFrom, saleTo } };
  }
  return { data, platforms, single: null };
}

function PriceTooltip({ active, payload, label, currency }: TooltipContentProps & { currency: Currency }) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="rounded-[7px] border border-line-strong bg-surface px-3 py-2 text-[11.5px]">
      <p className="mb-1 text-dim">{formatDate(new Date(Number(label)))}</p>
      <ul className="space-y-0.5">
        {payload.map((e) => (
          <li key={String(e.dataKey)} className="flex items-center gap-2">
            <span aria-hidden className="inline-block h-2 w-2 rounded-full" style={{ background: e.color }} />
            <span className="text-mut">{PLATFORM_LABEL[String(e.dataKey)] ?? String(e.dataKey)}</span>
            <span className="ml-auto font-semibold text-ink">{formatPrice(typeof e.value === "number" ? e.value : null, currency)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function PriceChart({ series }: { series: PriceSeries[] }) {
  const [rangeKey, setRangeKey] = useState(DEFAULT_RANGE_KEY);
  // 한 축에 두 통화를 그리면 선이 뜻 없이 겹친다(₩44,990 옆의 $6.99). 기준 통화만 그리고 나머지는 밑에 적는다
  const { kept: drawn, dropped, currency } = useMemo(() => sameCurrency(series), [series]);
  const clientNow = useNow();
  // 마운트 전에는 마지막 기록 시각을 "지금"으로 써서 서버/클라이언트 렌더를 일치시킨다
  const fallbackNow = useMemo(
    () => Math.max(...drawn.flatMap((s) => s.points.map((p) => new Date(p.t).getTime())), 0),
    [drawn],
  );
  const now = clientNow ?? fallbackNow;
  const range = RANGES.find((r) => r.key === rangeKey) ?? RANGES[0];
  const { data, platforms, single } = useMemo(() => prepare(drawn, range.days, now), [drawn, range.days, now]);

  // 정가 기준선과 진행 중 할인 구간이 축 밖으로 잘리지 않도록 도메인을 넓힌다
  const yMax = Math.max(
    ...data.flatMap((row) => platforms.map((p) => row[p] ?? 0)),
    single?.listPrice ?? 0,
    ...drawn.map((s) => s.listPrice ?? 0),
  );
  // 할인 종료선이 축 오른쪽 끝에 붙으면 라벨이 잘린다 — 구간 폭의 일부만큼 여유를 둔다
  const xMin = data[0]?.t ?? now;
  const xMaxBase = Math.max(data[data.length - 1]?.t ?? now, single?.saleTo ?? 0);
  const xMax = Math.round(xMaxBase + Math.max(xMaxBase - xMin, 0) * X_HEADROOM);

  return (
    <div className="space-y-3">
      <div role="group" aria-label="기간 선택" className="flex flex-wrap gap-1">
        {RANGES.map((r) => (
          <ChipButton key={r.key} active={r.key === rangeKey} onClick={() => setRangeKey(r.key)}>
            {r.label}
          </ChipButton>
        ))}
      </div>

      {data.length === 0 ? (
        <p className="py-10 text-center text-[13px] text-dim">이 기간에는 기록이 없습니다. 더 긴 기간을 선택해 보세요.</p>
      ) : (
        <div className="h-72 w-full sm:h-96" role="img" aria-label="플랫폼별 가격 변동 그래프">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 8, right: 12, bottom: 4, left: 8 }}>
              <CartesianGrid stroke="#F0EEE9" vertical={false} />
              <XAxis
                dataKey="t"
                type="number"
                scale="time"
                domain={["dataMin", xMax]}
                tickFormatter={(v: number) => formatDate(new Date(v))}
                stroke="#E6E3DD"
                tick={{ fill: "#8C8A84", fontSize: 11.5 }}
                minTickGap={40}
              />
              <YAxis
                tickFormatter={(v: number) => formatPrice(v, currency)}
                stroke="#E6E3DD"
                tick={{ fill: "#8C8A84", fontSize: 11.5 }}
                width={80}
                domain={[0, Math.round(yMax * Y_HEADROOM)]}
              />
              <Tooltip content={(props: TooltipContentProps) => <PriceTooltip {...props} currency={currency} />} cursor={{ stroke: "#A8A59E", strokeDasharray: "3 3" }} />
              {platforms.length > 1 && (
                <Legend formatter={(v: string) => <span className="text-[12px] text-mut">{PLATFORM_LABEL[v] ?? v}</span>} />
              )}

              {/* 진행 중 할인 구간 음영 */}
              {single?.saleFrom && single.saleTo && single.saleTo > single.saleFrom && (
                <ReferenceArea x1={single.saleFrom} x2={single.saleTo} fill="#F4F2ED" fillOpacity={1} stroke="#E6E3DD" strokeOpacity={1} />
              )}

              {/* 할인 종료 시점 — 라인은 "지금"에서 끝내고(미래 가격은 알 수 없다) 종료 시점만 표시 */}
              {single?.saleTo && single.saleTo > now && (
                <ReferenceLine x={single.saleTo} stroke="#A6462E" strokeDasharray="3 3">
                  <Label value={`할인 종료 ${formatDate(new Date(single.saleTo))}`} position="insideTopLeft" fill="#A6462E" fontSize={11.5} />
                </ReferenceLine>
              )}

              {/* 정가 기준선 */}
              {single?.listPrice ? (
                <ReferenceLine y={single.listPrice} stroke="#DFDCD5" strokeDasharray="4 4">
                  <Label value={`정가 ${formatPrice(single.listPrice, currency)}`} position="insideTopRight" fill="#8C8A84" fontSize={11.5} />
                </ReferenceLine>
              ) : null}

              {/* 역대 최저점 */}
              {single?.low && (
                <ReferenceDot x={single.low.t} y={single.low.price} r={4} fill="#1C1C1A" stroke="#FFFFFF">
                  <Label value={`최저 ${formatPrice(single.low.price, currency)}`} position="insideBottomLeft" fill="#3A5A4A" fontSize={11.5} />
                </ReferenceDot>
              )}

              {platforms.map((p) => (
                <Line
                  key={p}
                  type="stepAfter"
                  dataKey={p}
                  name={p}
                  stroke={PLATFORM_COLOR[p]}
                  strokeWidth={PLATFORM_WIDTH[p]}
                  dot={false}
                  activeDot={{ r: 4 }}
                  connectNulls
                  isAnimationActive={false}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {dropped.length > 0 && (
        <p className="text-[11.5px] text-dim">
          {dropped.map((s) => PLATFORM_LABEL[s.platform] ?? s.platform).join(", ")}는 결제 통화가 달라 이 그래프에 함께 그리지 않아요. 아래 표에서 통화 그대로 볼 수 있어요.
        </p>
      )}
    </div>
  );
}
