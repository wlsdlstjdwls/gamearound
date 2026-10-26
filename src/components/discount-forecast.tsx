// 할인 예측 판(기획서 v2.0 S-05, 목업 .pred). 계산은 lib/sales/forecast, 여기는 보여 주기만 한다.
// 날짜는 플랫폼 세일 일정(지금은 스팀), 가격은 역대 최저가의 ±10% 폭이다. 맞히는 값이 아니라 "기다리면 이 정도" 라
// 근거(공지된 일정인지, 추정인지)와 참고용 안내를 같이 적는다.
//
// 2026-10-26 결론 기둥의 작은 두 칸에서 가격 그래프 옆 판으로 옮겼다(목업). 그래프가 "지난 값" 을, 이 판이 "다음 값" 을 말해
// 둘이 한 줄에 서야 읽힌다. "알림 설정하기" 는 가격 알림 팝업(M-02)이라 화면이 버튼을 넘긴다.
import { formatPrice } from "@/lib/currency";
import { DETAIL_MESSAGES as D } from "@/lib/games/detail-messages";
import { FORECAST_RANGE_PCT, forecastPriceRange, type Forecast } from "@/lib/sales/forecast";
import { CalendarIcon } from "@/components/ui/icons";
import type { Currency } from "@/server/db/schema";

export function DiscountForecast({
  forecast,
  currency,
  currentLowest,
  basis,
  action,
}: {
  /** null 이면 날짜도 기록도 없다 — 판은 세우고 "기록이 쌓이면" 을 말한다(목업은 늘 판이 선다) */
  forecast: Forecast | null;
  currency: Currency;
  currentLowest: number | null;
  /** 예상 가격의 근거 한 줄(기록 최저가와 그 날짜). 없으면 줄을 세우지 않는다 */
  basis?: React.ReactNode;
  action?: React.ReactNode;
}) {
  const sale = forecast?.sale ?? null;
  const range = forecast?.expectedPrice != null ? forecastPriceRange(forecast.expectedPrice, currentLowest) : null;
  const days = sale && !sale.running ? D.forecastDays(sale.name, sale.daysUntil) : null;
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
          <h2 id="forecast-heading" className="text-[17px] font-extrabold text-ink">
            {D.forecastTitle}
          </h2>
          <p className="text-[14px] text-ink">
            {!sale && D.forecastNoDate}
            {sale?.running && D.forecastRunning(sale.name)}
            {days && (
              <>
                {days.before}
                <b className="font-extrabold">{days.days}</b>
                {days.after}
              </>
            )}
          </p>
          {sale && <p className="text-[12px] text-dim">{sale.confirmed ? D.forecastConfirmed : D.forecastEstimated}</p>}
          <p className="mt-1 text-[13.5px] text-mut">
            {range ? (
              <>
                {D.forecastExpected} |{" "}
                <b className="text-[17px] font-extrabold tabular-nums text-acc">
                  {formatPrice(range.low, currency)} ~ {formatPrice(range.high, currency)}
                </b>{" "}
                <small className="text-[11.5px]">{D.forecastRangeNote(FORECAST_RANGE_PCT)}</small>
              </>
            ) : (
              D.forecastNoRecord
            )}
          </p>
          {basis && <p className="text-[12px] text-dim">{basis}</p>}
        </div>
        {action && <div className="flex w-full sm:w-auto lg:w-full [&>*]:flex-1">{action}</div>}
      </section>
      <p className="text-[12px] leading-[1.6] text-dim">{D.forecastDisclaimer}</p>
    </div>
  );
}
