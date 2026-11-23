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
import { formatDate } from "@/lib/format";
import type { Platform } from "@/server/db/schema";
import type { PriceSeries } from "@/server/services/prices";
import { useNow } from "@/components/use-now";
import { chipClass } from "@/components/ui/chip";
import { cn } from "@/lib/cn";
import { useCssTokens } from "@/components/use-css-tokens";
import { mergeBrandSeries, prepare, seriesLabel } from "@/components/price-chart/prepare";
import { PriceTooltip } from "@/components/price-chart/tooltip";
import { PRICE_CHART_RELEASE_LABEL, PREORDER_LABEL } from "@/lib/games/messages";
import { ALL_PLATFORMS, usePlatformFilter } from "@/components/price-chart/use-platform-filter";

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
  ps5: "--store-ps5", // 주황
  ps4: "--store-ps4", // 자홍
  xbox: "--store-xbox", // 초록
  switch: "--store-switch", // 보라
  switch2: "--store-switch2", // 빨강
};

/**
 * 플랫폼 고르기 칩. 고른 칩은 먹색으로 채운다(2026-11-23 사용자 "탭 선택이 파란색이라 눈 아프다" 다음 "테두리만으론 눈에 안 띈다").
 * 기간 칸도 같은 먹색 채움이다 — 파랑 없이도 고른 것이 한눈에 보인다.
 * 채운 파랑 칩이 선 색 점(플랫폼 색)을 덮어 "이 칩이 저 선" 이 흐려졌다 — 칩의 색은 점 하나가 맡는다
 */
function pickChip(on: boolean): string {
  return chipClass({
    outline: true,
    className: cn("shrink-0 whitespace-nowrap", on && "!bg-ink font-bold !text-on-ink ring-1 ring-ink ring-inset"),
  });
}

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

/** 기간 선택 — days=null 은 전체. 짧은 쪽부터 선다(기획서 v2.0 S-05: 1개월, 3개월, 6개월, 1년) */
const RANGES: Array<{ key: string; label: string; days: number | null }> = [
  { key: "1m", label: "1개월", days: 30 },
  { key: "3m", label: "3개월", days: 90 },
  { key: "6m", label: "6개월", days: 180 },
  { key: "1y", label: "1년", days: 365 },
  { key: "all", label: "전체", days: null },
];
const DEFAULT_RANGE_KEY = "1y";
const DEFAULT_RANGE = RANGES.find((r) => r.key === DEFAULT_RANGE_KEY) ?? RANGES[0];
/** Y축 위쪽 여유 — 정가 기준선 라벨이 잘리지 않게 */
const Y_HEADROOM = 1.12;
/**
 * 최저점 라벨을 선에서 띄우는 거리(px). 글자 크기(11.5) 반에 선 굵기와 여백을 더한 값이다.
 * 라벨을 점 높이에 그대로 두면 계열 선이나 정가 기준선이 글자 가운데를 지나 "최저" 가 "최지" 처럼 읽혔다(2026-10-26, 콜 오브 듀티)
 */
const LOW_LABEL_GAP = 14;
/** 최저점이 Y축 아래쪽 이 비율 안에 있으면 라벨을 위로 올린다 — 아래로 내리면 X축 눈금 글자와 겹친다 */
const LOW_LABEL_FLIP_RATIO = 0.2;
/** X축 오른쪽 여유(구간 폭 대비) — 할인 종료선 라벨 자리 */
const X_HEADROOM = 0.18;
/**
 * head, rangeKeys 는 상세 본문에 들어간 그래프(2026-10-26, 목업 "가격 변동 추이")가 쓴다 — 제목과 기간 칩을 한 줄에 세우고
 * 기간은 기획서의 넷(1개월~1년)만 둔다. 전용 화면(/prices)은 둘 다 주지 않아 예전 모양 그대로다.
 */
export function PriceChart({ series, head, rangeKeys }: { series: PriceSeries[]; head?: React.ReactNode; rangeKeys?: readonly string[] }) {
  const ranges = rangeKeys ? RANGES.filter((r) => rangeKeys.includes(r.key)) : RANGES;
  // 그래프가 쓰는 색은 전부 여기서 한 번 읽는다 — 테마가 바뀌면 이 값이 통째로 새것이 된다
  const token = useCssTokens(CHART_TOKENS);
  const [rangeKey, setRangeKey] = useState(DEFAULT_RANGE_KEY);
  // 한 축에 두 통화를 그리면 선이 뜻 없이 겹친다(₩44,990 옆의 $6.99). 기준 통화만 그리고 나머지는 밑에 적는다
  // 같은 세대 묶음(PS5, PS4)은 선 하나로 합쳐 그린다 — 가격 카드도 한 장이다(./prepare 의 mergeBrandSeries)
  const { kept: drawn, dropped, currency } = useMemo(() => sameCurrency(mergeBrandSeries(series)), [series]);
  // 어느 선을 그릴지 — 상세에서는 플랫폼 카드와 같은 값을 쓴다(./use-platform-filter)
  const { shown, isOn, choose } = usePlatformFilter(drawn);
  const clientNow = useNow();
  // 마운트 전에는 마지막 기록 시각을 "지금"으로 써서 서버/클라이언트 렌더를 일치시킨다
  const fallbackNow = useMemo(
    () => Math.max(...drawn.flatMap((s) => s.points.map((p) => new Date(p.t).getTime())), 0),
    [drawn],
  );
  const now = clientNow ?? fallbackNow;
  const range = RANGES.find((r) => r.key === rangeKey) ?? DEFAULT_RANGE;
  const { data, platforms, single, preorder } = useMemo(() => prepare(shown, range.days, now), [shown, range.days, now]);

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

  /* 플랫폼이 둘 이상일 때만 고르는 자리를 만든다 — 하나뿐이면 "전체" 와 그 하나가 같은 말이다 */
  const platformChips = drawn.length > 1 && (
        // 좁은 화면은 꺾지 않고 가로로 민다 — 플랫폼이 넷이면 둘째 줄에 칩 하나가 떨어져 다른 묶음처럼 보였다
        <div role="group" aria-label="플랫폼 선택" className="-mx-1 flex gap-1.5 overflow-x-auto px-1 py-2 [scrollbar-width:none] sm:flex-wrap sm:overflow-visible sm:py-0">
          <button type="button" aria-pressed={isOn(ALL_PLATFORMS)} onClick={() => choose(ALL_PLATFORMS)} className={pickChip(isOn(ALL_PLATFORMS))}>
            전체
          </button>
          {drawn.map((s) => (
            <button key={s.platform} type="button" aria-pressed={isOn(s.platform)} onClick={() => choose(s.platform)} className={pickChip(isOn(s.platform))}>
              {/* 칩의 점이 그래프의 선 색과 같아야 "이 칩이 저 선" 이 말없이 이어진다 */}
              <span
                aria-hidden
                className="mr-1.5 inline-block size-2 shrink-0 rounded-full"
                style={{ background: token[PLATFORM_TOKEN[s.platform]] }}
              />
              {seriesLabel(s.platform)}
            </button>
          ))}
        </div>
      );
  const rangeRow = (
    <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        {head}
        {/* 기간은 하나만 고르는 칸 넷이라 한 판 위의 세그먼트로 세운다(2026-11-20 사용자 "가격변동 추이 필터 기능들 모바일에 맞게").
            칩 넷일 때는 고른 "1년" 만 파란 알약으로 부풀고 나머지는 맨 글자라 아래 플랫폼 칩과 모양이 겹쳐 무엇이 무엇을 거르는지 안 갈렸다.
            좁은 화면은 판이 폭을 다 써서 칸 넷이 고르게 나뉜다. 고른 칸은 면 명암(흰 면 + 그림자)으로만 말한다 — 파랑은 아래 플랫폼 칩의 몫이다 */}
        <div role="group" aria-label="기간 선택" className="grid w-full grid-cols-4 gap-0.5 rounded-xl bg-surface-2 p-1 sm:inline-grid sm:w-auto">
          {ranges.map((r) => {
            const on = r.key === rangeKey;
            return (
              <button
                key={r.key}
                type="button"
                aria-pressed={on}
                onClick={() => setRangeKey(r.key)}
                className={cn(
                  "press tap-inset h-8 rounded-lg px-3 text-[13px] tabular-nums transition-colors duration-fast",
                  on ? "bg-ink font-semibold text-on-ink shadow-1" : "text-mut hover:text-ink",
                )}
              >
                {r.label}
              </button>
            );
          })}
        </div>
      </div>
  );
  // 상세 본문(head)에서는 제목과 기간이 맨 윗줄이다 — 목업은 그 줄 아래로 그래프가 바로 이어진다

  return (
    <div className="space-y-3">
      {head ? rangeRow : platformChips}
      {head ? platformChips : rangeRow}
      {data.length === 0 ? (
        <p className="py-10 text-center text-[13px] text-dim">이 기간에는 기록이 없습니다. 더 긴 기간을 선택해 보세요.</p>
      ) : (
        <div className={head ? "h-60 w-full sm:h-72" : "h-72 w-full sm:h-96"} role="img" aria-label="플랫폼별 가격 변동 그래프">
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
                // 바닥(0) 눈금은 비운다 — formatPrice 가 0 을 "무료" 로 적는데, 그 글자가 첫 날짜 눈금과 겹쳤다(2026-11-11).
                // 바닥은 X 축 선이 대신 말한다. 실제 무료 구간은 말풍선이 "무료" 로 보여 준다
                tickFormatter={(v: number) => (v === 0 ? "" : formatPrice(v, currency))}
                stroke={token["--line"]}
                tick={{ fill: token["--dim"], fontSize: 11.5 }}
                width={80}
                domain={[0, Math.round(yMax * Y_HEADROOM)]}
              />
              <Tooltip content={(props: TooltipContentProps) => <PriceTooltip {...props} currency={currency} />} cursor={{ stroke: token["--dim-2"], strokeDasharray: "3 3" }} />
              {platforms.length > 1 && (
                <Legend formatter={(v: string) => <span className="text-[12px] text-mut">{seriesLabel(v as Platform)}</span>} />
              )}

              {/* 사전예약 구간 — 그 값은 예약가라 출시 뒤 값과 견주면 인하처럼 읽힌다(2026-11-19 사용자, GTA6). 할인 음영보다 옅은 면에 이름표만 단다 */}
              {preorder && (
                <ReferenceArea x1={preorder.from} x2={preorder.to} fill={token["--surface-4"]} fillOpacity={0.5}>
                  {/* 이름표는 구간 아래쪽에 둔다(2026-11-20 사용자 확인). 위쪽에 두면 출시선 이름표("출시 날짜")가 선 왼쪽으로 펼쳐지며
                      같은 높이에서 겹쳐 "사전예약" 과 "출시" 가 한 덩어리로 뭉갰다(GTA6, 390px). 값 선은 대개 축 위쪽이라 아래가 비어 있다 */}
                  <Label value={PREORDER_LABEL} position="insideBottomLeft" fill={token["--dim"]} fontSize={11.5} />
                </ReferenceArea>
              )}
              {preorder?.releaseAt && (
                <ReferenceLine x={preorder.releaseAt} stroke={token["--dim-2"]} strokeDasharray="3 3">
                  <Label value={`${PRICE_CHART_RELEASE_LABEL} ${formatDate(new Date(preorder.releaseAt))}`} position="insideTopRight" fill={token["--dim"]} fontSize={11.5} />
                </ReferenceLine>
              )}

              {/* 진행 중 할인 구간 음영 */}
              {single?.saleFrom && single.saleTo && single.saleTo > single.saleFrom && (
                <ReferenceArea x1={single.saleFrom} x2={single.saleTo} fill={token["--surface-4"]} fillOpacity={1} stroke={token["--line"]} strokeOpacity={1} />
              )}

              {/* 할인 종료 시점 — 라인은 "지금"에서 끝내고(미래 가격은 알 수 없다) 종료 시점만 표시 */}
              {single?.saleTo && single.saleTo > now && (
                <ReferenceLine x={single.saleTo} stroke={token["--danger"]} strokeDasharray="3 3">
                  {/* 라벨은 선 왼쪽에 붙인다(2026-10-26) — 상세 본문에 들어가 그래프 폭이 줄자 오른쪽에 붙은 날짜가 판 밖으로 잘렸다 */}
                  <Label value={`할인 종료 ${formatDate(new Date(single.saleTo))}`} position="insideTopRight" fill={token["--danger"]} fontSize={11.5} />
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
                  {/* 점 오른쪽에 붙이고 선 아래(바닥 가까우면 위)로 비킨다 — 최저점은 대개 계열 선 위에 있어 같은 높이면 글자를 긋는다 */}
                  <Label
                    value={`최저 ${formatPrice(single.low.price, currency)}`}
                    position="right"
                    dy={single.low.price < yMax * Y_HEADROOM * LOW_LABEL_FLIP_RATIO ? -LOW_LABEL_GAP : LOW_LABEL_GAP}
                    fill={token["--ok"]}
                    fontSize={11.5}
                  />
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
        <p className="text-[11.5px] text-dim max-sm:text-[12.5px]">
          {dropped.map((s) => seriesLabel(s.platform)).join(", ")}는 결제 통화가 달라 이 그래프에 함께 그리지 않아요. 아래 표에서 통화 그대로 볼 수 있어요.
        </p>
      )}
    </div>
  );
}
