"use client";
// 가격 이력 차트 — recharts LineChart. 플랫폼별 라인(색은 플랫폼 고정 매핑), 단일 통화 축(sameCurrency)
// 표시 규칙(dekudeals 참고):
//  - 가격은 "바뀔 때만" 기록되므로 각 라인은 마지막 기록 → 지금까지 수평으로 이어 그린다(기록 1건이면 점이 아니라 선으로 보이게)
//  - 구간을 좁히면 구간 시작 시점의 가격을 앵커 포인트로 만들어 라인이 끊기지 않게 한다
//  - 플랫폼이 하나일 때만 정가 기준선, 역대 최저점, 진행 중 할인 구간을 함께 그린다(여러 개면 읽기 어려움)
//  - 플랫폼을 하나 고르면 그 계열만 그린다 — 선이 넷을 넘으면 색과 선 모양으로도 안 갈린다.
//    고르는 순간 위의 단일 표시(정가선, 최저점, 할인 구간)가 따라 붙는 것이 이 탭의 값어치다
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
import { useCssTokens } from "@/components/use-css-tokens";

/**
 * 플랫폼 → 색 토큰 이름(엔티티 기준, 순서, 개수와 무관 — 필터로 선이 줄어도 남은 선의 색은 그대로다).
 *
 * 왜 바꿨나(2026-09-15): 이전 팔레트는 전부 따뜻한 회색이라 명도로만 갈렸다.
 * 명도 구분은 선이 겹치는 순간 무너진다 — 가격이 같은 구간에서는 선이 포개져 위의 것만 보인다.
 * 그래서 색상(hue)으로 가른 8색으로 바꿨다. 값은 검증기(dataviz validate_palette)가
 * 흰 표면 기준으로 통과시킨 조합이다: 색각 이상 인접쌍 ΔE 9.1, 정상 시야 19.6.
 * 순서는 PLATFORM_ORDER 와 같다 — 인접쌍 검증이 그 순서를 전제한다.
 *
 * 값 자체는 globals.css 에 있다(--store-*). recharts 는 stroke 를 SVG 표현 속성으로 내보내고
 * 그 안에서는 var() 가 풀리지 않으므로, 이름만 여기 두고 계산된 값은 useCssTokens 가 읽어 온다.
 * 그 덕분에 다크에서는 같은 이름이 한 단 밝은 값으로 바뀐다.
 */
const PLATFORM_TOKEN: Record<Platform, string> = {
  steam: "--store-steam", // 파랑
  epic: "--store-epic", // 주황
  ps5: "--store-ps5", // 노랑
  ps4: "--store-ps4", // 자홍
  xbox: "--store-xbox", // 초록
  switch: "--store-switch", // 보라
  switch2: "--store-switch2", // 빨강
};

/** 그래프의 판 색(격자, 축, 기준선). 화면의 나머지와 같은 토큰을 쓴다 */
const CHART_TOKENS = [
  "--line",
  "--line-soft",
  "--line-strong",
  "--surface",
  "--surface-4",
  "--ink",
  "--dim",
  "--dim-2",
  "--danger",
  "--ok",
  ...Object.values(PLATFORM_TOKEN),
] as const;

/**
 * 색 말고 하나 더 — 선 모양. 색만으로 가르면 두 가지 자리에서 진다:
 * 가격이 같아 선이 정확히 포개지는 구간(위의 선만 보인다), 그리고 색각 이상.
 * 파선이면 아래 선이 틈으로 비친다. 대표 플랫폼(steam)만 실선으로 두어 기준선을 만든다.
 */
const PLATFORM_DASH: Record<Platform, string | undefined> = {
  steam: undefined,
  epic: "7 4",
  ps5: "11 4",
  ps4: "7 3 2 3",
  xbox: "1 4",
  switch: "13 4 2 4",
  switch2: "4 3",
};

/** 선 굵기는 전부 같다 — 굵기로 순위를 말하지 않는다(색과 선 모양이 이미 정체를 말한다) */
const LINE_WIDTH = 2;

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

/** 플랫폼 칩의 "전체". 플랫폼 값과 겹치지 않는 문자열이어야 한다 */
const ALL_PLATFORMS = "all";

export function PriceChart({ series }: { series: PriceSeries[] }) {
  // 그래프가 쓰는 색은 전부 여기서 한 번 읽는다 — 테마가 바뀌면 이 값이 통째로 새것이 된다
  const token = useCssTokens(CHART_TOKENS);
  const [rangeKey, setRangeKey] = useState(DEFAULT_RANGE_KEY);
  const [pick, setPick] = useState<Platform | typeof ALL_PLATFORMS>(ALL_PLATFORMS);
  // 한 축에 두 통화를 그리면 선이 뜻 없이 겹친다(₩44,990 옆의 $6.99). 기준 통화만 그리고 나머지는 밑에 적는다
  const { kept: drawn, dropped, currency } = useMemo(() => sameCurrency(series), [series]);
  // 고른 플랫폼이 사라졌으면(게임이 바뀌거나 계열이 줄면) 조용히 전체로 돌아간다
  const picked = pick !== ALL_PLATFORMS && drawn.some((s) => s.platform === pick) ? pick : ALL_PLATFORMS;
  const shown = useMemo(
    () => (picked === ALL_PLATFORMS ? drawn : drawn.filter((s) => s.platform === picked)),
    [drawn, picked],
  );
  const clientNow = useNow();
  // 마운트 전에는 마지막 기록 시각을 "지금"으로 써서 서버/클라이언트 렌더를 일치시킨다
  const fallbackNow = useMemo(
    () => Math.max(...drawn.flatMap((s) => s.points.map((p) => new Date(p.t).getTime())), 0),
    [drawn],
  );
  const now = clientNow ?? fallbackNow;
  const range = RANGES.find((r) => r.key === rangeKey) ?? RANGES[0];
  const { data, platforms, single } = useMemo(() => prepare(shown, range.days, now), [shown, range.days, now]);

  // 정가 기준선과 진행 중 할인 구간이 축 밖으로 잘리지 않도록 도메인을 넓힌다
  const yMax = Math.max(
    ...data.flatMap((row) => platforms.map((p) => row[p] ?? 0)),
    single?.listPrice ?? 0,
    ...shown.map((s) => s.listPrice ?? 0),
  );
  // 할인 종료선이 축 오른쪽 끝에 붙으면 라벨이 잘린다 — 구간 폭의 일부만큼 여유를 둔다
  const xMin = data[0]?.t ?? now;
  const xMaxBase = Math.max(data[data.length - 1]?.t ?? now, single?.saleTo ?? 0);
  const xMax = Math.round(xMaxBase + Math.max(xMaxBase - xMin, 0) * X_HEADROOM);

  return (
    <div className="space-y-3">
      {/* 플랫폼이 둘 이상일 때만 고르는 자리를 만든다 — 하나뿐이면 "전체" 와 그 하나가 같은 말이다 */}
      {drawn.length > 1 && (
        <div role="group" aria-label="플랫폼 선택" className="flex flex-wrap gap-1">
          <ChipButton active={picked === ALL_PLATFORMS} onClick={() => setPick(ALL_PLATFORMS)}>
            전체
          </ChipButton>
          {drawn.map((s) => (
            <ChipButton key={s.platform} active={picked === s.platform} onClick={() => setPick(s.platform)}>
              {/* 칩의 점이 그래프의 선 색과 같아야 "이 칩이 저 선" 이 말없이 이어진다 */}
              <span
                aria-hidden
                className="mr-1.5 inline-block size-2 shrink-0 rounded-full"
                style={{ background: token[PLATFORM_TOKEN[s.platform]] }}
              />
              {PLATFORM_LABEL[s.platform] ?? s.platform}
            </ChipButton>
          ))}
        </div>
      )}

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
              <CartesianGrid stroke={token["--line-soft"]} vertical={false} />
              <XAxis
                dataKey="t"
                type="number"
                scale="time"
                domain={["dataMin", xMax]}
                tickFormatter={(v: number) => formatDate(new Date(v))}
                stroke={token["--line"]}
                tick={{ fill: token["--dim"], fontSize: 11.5 }}
                minTickGap={40}
              />
              <YAxis
                tickFormatter={(v: number) => formatPrice(v, currency)}
                stroke={token["--line"]}
                tick={{ fill: token["--dim"], fontSize: 11.5 }}
                width={80}
                domain={[0, Math.round(yMax * Y_HEADROOM)]}
              />
              <Tooltip content={(props: TooltipContentProps) => <PriceTooltip {...props} currency={currency} />} cursor={{ stroke: token["--dim-2"], strokeDasharray: "3 3" }} />
              {platforms.length > 1 && (
                <Legend formatter={(v: string) => <span className="text-[12px] text-mut">{PLATFORM_LABEL[v] ?? v}</span>} />
              )}

              {/* 진행 중 할인 구간 음영 */}
              {single?.saleFrom && single.saleTo && single.saleTo > single.saleFrom && (
                <ReferenceArea x1={single.saleFrom} x2={single.saleTo} fill={token["--surface-4"]} fillOpacity={1} stroke={token["--line"]} strokeOpacity={1} />
              )}

              {/* 할인 종료 시점 — 라인은 "지금"에서 끝내고(미래 가격은 알 수 없다) 종료 시점만 표시 */}
              {single?.saleTo && single.saleTo > now && (
                <ReferenceLine x={single.saleTo} stroke={token["--danger"]} strokeDasharray="3 3">
                  <Label value={`할인 종료 ${formatDate(new Date(single.saleTo))}`} position="insideTopLeft" fill={token["--danger"]} fontSize={11.5} />
                </ReferenceLine>
              )}

              {/* 정가 기준선 */}
              {single?.listPrice ? (
                <ReferenceLine y={single.listPrice} stroke={token["--line-strong"]} strokeDasharray="4 4">
                  <Label value={`정가 ${formatPrice(single.listPrice, currency)}`} position="insideTopRight" fill={token["--dim"]} fontSize={11.5} />
                </ReferenceLine>
              ) : null}

              {/* 역대 최저점 */}
              {single?.low && (
                <ReferenceDot x={single.low.t} y={single.low.price} r={4} fill={token["--ink"]} stroke={token["--surface"]}>
                  <Label value={`최저 ${formatPrice(single.low.price, currency)}`} position="insideBottomLeft" fill={token["--ok"]} fontSize={11.5} />
                </ReferenceDot>
              )}

              {platforms.map((p) => (
                <Line
                  key={p}
                  type="stepAfter"
                  dataKey={p}
                  name={p}
                  stroke={token[PLATFORM_TOKEN[p]]}
                  strokeWidth={LINE_WIDTH}
                  strokeDasharray={PLATFORM_DASH[p]}
                  // 범례 아이콘도 선 모양을 그대로 따라야 한다 — 기본 아이콘은 실선이라 파선 구분이 범례에서 사라진다
                  legendType="plainline"
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
