// 할인 예측 판(기획서 v2.0 S-05, 목업 .pred). 계산은 lib/sales/forecast, 여기는 보여 주기만 한다.
// 순서가 곧 뜻이다: 지금 할인 중이면 그것부터, 그다음 다음 할인까지 며칠, 마지막으로 그때 값의 ±10% 폭.
// 맞히는 값이 아니라 "기다리면 이 정도" 라 근거(공지된 일정, 예년 일정, 이 게임의 지난 주기, 기록 최저가, 최대 할인율)를 같이 적는다.
//
// 2026-10-26 결론 기둥의 작은 두 칸에서 가격 그래프 옆 판으로 옮겼다(목업). 그래프가 "지난 값" 을, 이 판이 "다음 값" 을 말해
// 둘이 한 줄에 서야 읽힌다. "알림 설정하기" 는 가격 알림 팝업(M-02)이라 화면이 버튼을 넘긴다.
import { formatPrice } from "@/lib/currency";
import { formatDate } from "@/lib/format";
import { DETAIL_MESSAGES as D } from "@/lib/games/detail-messages";
import { GAME_MESSAGES } from "@/lib/games/messages";
import { FORECAST_RANGE_PCT, type Forecast } from "@/lib/sales/forecast";
import { EmptyLine } from "@/components/game-detail/empty-line";
import { CalendarIcon } from "@/components/ui/icons";
import type { Currency } from "@/server/db/schema";

function Days({ parts }: { parts: { before: string; days: string; after: string } }) {
  return (
    <>
      {parts.before}
      <b className="font-extrabold">{parts.days}</b>
      {parts.after}
    </>
  );
}

export function DiscountForecast({
  forecast,
  currency,
  action,
  basisLabel,
}: {
  /** null 이면 날짜도 기록도 없다 — 강조 판 대신 한 줄로 접고 "기록이 쌓이면" 을 말한다(아래 empty) */
  forecast: Forecast | null;
  currency: Currency;
  action?: React.ReactNode;
  /** 고른 플랫폼 이름(game-detail/forecast-by-platform). 주면 제목 옆에 "PlayStation 기준" 이 선다 */
  basisLabel?: string;
}) {
  const running = forecast?.running ?? null;
  const next = forecast?.next ?? null;
  const expected = forecast?.expected ?? null;
  const nextNote = next ? (next.basis === "cycle" ? D.forecastCycle(next.cycleDays ?? 0) : next.basis === "confirmed" ? D.forecastConfirmed : D.forecastEstimated) : null;
  // 말할 것이 하나도 없으면 파란 강조 판을 세우지 않는다(2026-10-27 사용자 검수: 기록이 없는데 강조 판이 크게 남았다).
  // 알림 단추는 남긴다 — 예측이 없어도 "싸지면 알려 달라" 는 할 수 있다. 참고용 안내 문단도 예측이 없으니 뺀다
  if (!running && !next && !expected) {
    return (
      <EmptyLine
        id="forecast-heading"
        icon={<CalendarIcon size={17} />}
        title={basisLabel ? `${D.forecastTitle} | ${D.forecastBasisPlatform(basisLabel)}` : D.forecastTitle}
        action={action}
      >
        {D.forecastNoRecord}
      </EmptyLine>
    );
  }
  return (
    <div className="flex flex-col gap-2.5">
      <section
        aria-labelledby="forecast-heading"
        className="flex flex-col gap-4 rounded-[var(--radius-panel)] bg-acc-soft p-5 ring-2 ring-acc ring-inset sm:flex-row sm:items-center lg:flex-col lg:items-start"
      >
        <span aria-hidden className="grid size-12 shrink-0 place-items-center rounded-full text-acc ring-2 ring-acc ring-inset">
          <CalendarIcon size={22} />
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <h2 id="forecast-heading" className="flex flex-wrap items-baseline gap-x-2 text-[17px] font-extrabold text-ink">
            {D.forecastTitle}
            {basisLabel && <span className="text-[12.5px] font-bold text-acc">{D.forecastBasisPlatform(basisLabel)}</span>}
          </h2>
          {running && (
            <p className="text-[14px] font-bold text-acc">
              {D.forecastRunning(running.name, running.pct)}
              {running.daysLeft !== null && <Days parts={D.forecastRunningLeft(running.daysLeft)} />}
            </p>
          )}
          <p className="text-[14px] text-ink">{next ? <Days parts={D.forecastDays(next.name, next.daysUntil)} /> : D.forecastNoDate}</p>
          {nextNote && <p className="text-[12px] text-dim">{nextNote}</p>}
          <p className="mt-1 text-[13.5px] text-mut">
            {expected ? (
              <>
                {D.forecastExpected} |{" "}
                <b className="text-[17px] font-extrabold tabular-nums text-acc">
                  {formatPrice(expected.low, currency)} ~ {formatPrice(expected.high, currency)}
                </b>{" "}
                <small className="text-[11.5px]">{D.forecastRangeNote(FORECAST_RANGE_PCT)}</small>
              </>
            ) : (
              D.forecastNoRecord
            )}
          </p>
          {expected && (
            <p className="text-[12px] text-dim">
              {expected.basis === "recorded-low" ? `${GAME_MESSAGES.recordedLowLabel} ${formatPrice(expected.price, currency)} | ${formatDate(expected.at)}` : D.forecastBasisRate(expected.pct)}
            </p>
          )}
        </div>
        {action && <div className="flex w-full sm:w-auto lg:w-full [&>*]:flex-1">{action}</div>}
      </section>
      <p className="text-[12px] leading-[1.6] text-dim">{D.forecastDisclaimer}</p>
    </div>
  );
}
