// 플레이타임 3종 — HLTB 기준(메인/메인+서브/완전정복). 구매 결정의 "얼마나 걸리나"에 답하는 칸.
// 표기는 "라벨 + 가로 막대 + 시간 텍스트" 한 줄. 막대는 보조 신호이고 값은 항상 텍스트로도 읽힌다(a11y).
//
// 카드 아래에는 시간당 가격을 눈금 위에 세운다. 숫자만 크게 키우지 않은 이유(2026-09-15):
// "441원" 하나로는 살지 말지 못 정한다. 싼지 비싼지는 다른 게임을 알아야 나오는 말이라
// 카탈로그 분포 위에 이 게임을 찍고, 판정을 한 단어로 함께 적는다.
import { stagger } from "@/lib/motion";
import { formatHours } from "@/lib/format";
import { formatPrice, DISPLAY_CURRENCY } from "@/lib/currency";
import { PER_HOUR_MESSAGES, PER_HOUR_VERDICT_LABEL, perHourScopeText } from "@/lib/games/messages";
import {
  canPlaceOnScale,
  PER_HOUR_LABEL_GAP_PCT,
  perHourPosition,
  perHourVerdict,
  pricePerHour,
  toPositiveNumber,
  type PerHourVerdict,
  type PricePerHourScale,
} from "@/lib/price-per-hour";
import type { Currency } from "@/server/db/schema";
import type { PlaytimeDto } from "@/server/services/games";
import { cardClass } from "@/components/ui/page";

type ItemKey = keyof Omit<PlaytimeDto, "lastSyncedAt">;

// 막대는 하나의 색을 밝기로만 나눈다(채도 대비 금지 — 저채도 정보형 UI).
// 본문색 사다리(ink > mut > dim-2)를 쓰다가 브랜드 색 사다리로 바꿨다(2026-09-15):
// 회색 막대는 옆 글자와 같은 색이라 그래픽으로 읽히지 않았고, 이 카드만 화면에서 브랜드가 지워진 칸이었다.
// 값에 뜻을 붙이는 색(ok, danger, price-*)은 여기 쓰지 않는다 — 시간이 길고 짧은 것은 좋고 나쁨이 아니다.
const ITEMS: Array<{ key: ItemKey; label: string; barClass: string }> = [
  { key: "mainStoryHours", label: "메인 스토리", barClass: "bg-acc" },
  { key: "mainExtraHours", label: "메인 + 서브", barClass: "bg-acc-2" },
  { key: "completionistHours", label: "완전 정복", barClass: "bg-acc-3" },
];

const EMPTY_TEXT = "플레이타임 정보가 아직 없습니다.";
const MISSING_TEXT = "정보 없음";
/** 스케일 기준: 해당 게임의 최댓값 = 100%. 게임마다 2시간짜리와 5,000시간짜리가 섞여 절대 기준은 의미가 없다 */
const FULL_PCT = 100;
/** 최댓값 대비 1% 미만인 값도 막대가 보이도록 하한을 준다 */
const MIN_BAR_PCT = 5;

/**
 * 판정 색 — 금액, 판정 단어, 축 마커가 한 색으로 같이 움직인다.
 * "싼 편"은 브랜드 색이다(2026-09-15 교체): 초록이면 같은 화면의 --ok 와 같은 말을 하고,
 * 이 카드만 다른 색 계열로 떠 브랜드가 없는 칸처럼 보였다. "비싼 편"만 전용 경고색을 쓴다(globals.css 주석).
 * 보통을 본문색(ink)으로 두는 이유: 20px 금액을 회색으로 깔면 카드에서 제일 중요한 값이 죽는다.
 */
const AMOUNT_CLASS: Record<PerHourVerdict, string> = {
  cheap: "text-acc",
  mid: "text-ink",
  pricy: "text-price-bad",
};

/** 판정 단어 — 금액과 같은 색. 보통일 때만 물러난다(말 자체가 "특별할 것 없다"는 뜻이다) */
const VERDICT_CLASS: Record<PerHourVerdict, string> = {
  cheap: "text-acc",
  mid: "text-dim",
  pricy: "text-price-bad",
};

/** 축 위 마커 — 색이 판정과 어긋나면 같은 사실을 두 번 다르게 말하는 꼴이 된다 */
const MARKER_CLASS: Record<PerHourVerdict, { bar: string; label: string }> = {
  cheap: { bar: "bg-acc", label: "text-acc" },
  mid: { bar: "bg-ink", label: "text-ink" },
  pricy: { bar: "bg-price-bad", label: "text-price-bad" },
};

function maxHours(playtime: PlaytimeDto | null): number {
  if (!playtime) return 0;
  return Math.max(0, ...ITEMS.map((it) => toPositiveNumber(playtime[it.key]) ?? 0));
}

function hasAnyValue(playtime: PlaytimeDto | null): boolean {
  return maxHours(playtime) > 0;
}

function barPct(hours: number, max: number): number {
  if (max <= 0) return 0;
  return Math.max(MIN_BAR_PCT, (hours / max) * FULL_PCT);
}

function PlaytimeBars({ playtime, compact }: { playtime: PlaytimeDto | null; compact?: boolean }) {
  const max = maxHours(playtime);
  return (
    <dl className="flex flex-col gap-2">
      {ITEMS.map((it, i) => {
        const hours = toPositiveNumber(playtime?.[it.key]);
        return (
          <div key={it.key} className="flex items-center gap-2.5">
            <dt className={`${compact ? "w-[4.25rem] text-[11px]" : "w-[68px] text-[12px]"} shrink-0 text-mut`}>{it.label}</dt>
            <div
              className={`min-w-0 flex-1 overflow-hidden rounded-full bg-surface-2 ${compact ? "h-1.5" : "h-1.5"}`}
              // 값은 옆 텍스트로 읽히므로 막대 자체는 보조 그래픽
              aria-hidden="true"
            >
              {hours !== null && (
                <div
                  className={`bar-grow h-full rounded-full ${it.barClass}`}
                  style={{ ...stagger(i), "--bar-w": `${barPct(hours, max)}%` } as React.CSSProperties}
                />
              )}
            </div>
            <dd
              className={
                hours !== null
                  ? `w-[58px] shrink-0 text-right text-[12.5px] font-bold text-ink`
                  : `w-[58px] shrink-0 text-right text-[11px] text-dim-2`
              }
            >
              {hours !== null ? formatHours(hours) : MISSING_TEXT}
            </dd>
          </div>
        );
      })}
    </dl>
  );
}

/** 헤더 안에 얇게 넣는 형태(다른 화면에서 재사용) */
export function PlaytimeStrip({ playtime }: { playtime: PlaytimeDto | null }) {
  return (
    <section aria-labelledby="playtime-heading" className="rounded-[7px] border border-line bg-surface p-3">
      <h2 id="playtime-heading" className="mb-2 text-[11.5px] font-semibold text-dim">
        플레이타임
      </h2>
      {hasAnyValue(playtime) ? <PlaytimeBars playtime={playtime} compact /> : <p className="text-[12.5px] text-dim">{EMPTY_TEXT}</p>}
    </section>
  );
}

/** 숫자 + 단위. 눈금이 있든 없든 같은 크기로 읽히게 한 곳에서 만든다. 색만 판정에 따라 달라진다 */
function PerHourAmount({ perHour, currency, verdict }: { perHour: number; currency: Currency; verdict?: PerHourVerdict }) {
  return (
    <p className={`text-[20px] font-extrabold leading-none tracking-tight ${verdict ? AMOUNT_CLASS[verdict] : "text-ink"}`}>
      {formatPrice(perHour, currency)}
      <span className="text-[11.5px] font-semibold text-dim">{PER_HOUR_MESSAGES.unit}</span>
    </p>
  );
}

/**
 * 분포 위의 눈금. 축은 그래픽이라 aria-hidden 이고, 같은 사실을 옆의 판정 한 단어와 아래 한 줄이 글로 말한다.
 * 두 눈금이 가까우면 중간값 라벨만 접는다 — 이 게임 라벨은 접지 않는다(그게 읽으러 온 값이다).
 */
function PerHourScale({ perHour, currency, scale }: { perHour: number; currency: Currency; scale: PricePerHourScale }) {
  const mePct = perHourPosition(perHour, scale.axisMax);
  const medianPct = perHourPosition(scale.median, scale.axisMax);
  const q1Pct = perHourPosition(scale.q1, scale.axisMax);
  const q3Pct = perHourPosition(scale.q3, scale.axisMax);
  const verdict = perHourVerdict(perHour, scale);
  const showMedianLabel = Math.abs(mePct - medianPct) >= PER_HOUR_LABEL_GAP_PCT;

  return (
    <div className="flex flex-col gap-2 border-t border-line-soft pt-2.5">
      <div className="flex items-baseline justify-between gap-2">
        <PerHourAmount perHour={perHour} currency={currency} verdict={verdict} />
        <p className={`text-[11.5px] font-bold ${VERDICT_CLASS[verdict]}`}>{PER_HOUR_VERDICT_LABEL[verdict]}</p>
      </div>

      <div className="relative h-[22px]" aria-hidden="true">
        {/* 왼쪽이 싼 쪽. 진한 띠는 절반이 모인 구간(q1~q3)이라 마커가 그 밖에 있으면 "편"이 눈에 보인다.
            그라데이션을 걷어낸 이유(2026-09-15): 두 토큰의 명도차가 작아 화면에서 한 가지 회색으로 읽혔다 */}
        <div className="absolute inset-x-0 top-[3px] h-1 rounded-full bg-surface-2" />
        <div
          className="absolute top-[3px] h-1 rounded-full bg-line-strong"
          style={{ left: `${q1Pct}%`, width: `${Math.max(0, q3Pct - q1Pct)}%` }}
        />
        <div className="absolute top-0 h-2.5 w-px bg-dim-2" style={{ left: `${medianPct}%` }}>
          {showMedianLabel && (
            <span className="absolute -left-4 top-3 w-8 text-center text-[9.5px] text-dim-2">{PER_HOUR_MESSAGES.medianTick}</span>
          )}
        </div>
        <div className={`absolute top-0 h-2.5 w-[3px] rounded-full ${MARKER_CLASS[verdict].bar}`} style={{ left: `${mePct}%` }}>
          <span className={`absolute -left-[14px] top-3 w-8 text-center text-[9.5px] font-bold ${MARKER_CLASS[verdict].label}`}>
            {PER_HOUR_MESSAGES.meTick}
          </span>
        </div>
      </div>

      <p className="text-[11px] text-dim">
        {PER_HOUR_MESSAGES.basis} | {perHourScopeText(scale.sampleSize)}
      </p>
    </div>
  );
}

/** 눈금을 세울 수 없을 때 — 숫자만 말한다(통화가 다르거나 표본이 모자란 경우) */
function PerHourPlain({ perHour, currency }: { perHour: number; currency: Currency }) {
  return (
    <div className="flex items-baseline justify-between gap-2 border-t border-line-soft pt-2.5">
      <PerHourAmount perHour={perHour} currency={currency} />
      <p className="text-[11px] text-dim">{PER_HOUR_MESSAGES.basis}</p>
    </div>
  );
}

/** 상세 사이드바 카드 — 하단에 "시간당 가격" 파생 지표 */
export function PlaytimeCard({
  playtime,
  currentPrice,
  currency = DISPLAY_CURRENCY,
  scale = null,
}: {
  playtime: PlaytimeDto | null;
  currentPrice?: number | null;
  currency?: Currency;
  /** 카탈로그 분포. 없으면 눈금 없이 숫자만 선다 */
  scale?: PricePerHourScale | null;
}) {
  const perHour = pricePerHour(currentPrice, toPositiveNumber(playtime?.mainStoryHours));

  return (
    <section aria-labelledby="playtime-card-heading" className={cardClass("flex flex-col gap-3 p-4")}>
      {/* 출처, 갱신일 표기를 뺀 이유(2026-09-15): 어디서 온 값이고 언제 받았는지는
          이 칸을 읽는 사람이 묻는 것이 아니다. 묻는 것은 "얼마나 걸리나" 하나다 */}
      <h2 id="playtime-card-heading" className="text-[13.5px] font-bold text-ink">
        플레이타임
      </h2>
      {hasAnyValue(playtime) ? <PlaytimeBars playtime={playtime} /> : <p className="text-[12.5px] text-dim">{EMPTY_TEXT}</p>}
      {perHour !== null &&
        (canPlaceOnScale(currency, scale) ? (
          <PerHourScale perHour={perHour} currency={currency} scale={scale} />
        ) : (
          <PerHourPlain perHour={perHour} currency={currency} />
        ))}
    </section>
  );
}
