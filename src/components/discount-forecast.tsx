// 게임 상세 결론 기둥의 할인 예측 한 칸(기획서 v2.0 S-05). 계산은 lib/sales/forecast, 여기는 보여 주기만 한다.
// 날짜는 플랫폼 세일 일정(지금은 스팀), 가격은 역대 최저가다. 맞히는 값이 아니라 "기다리면 이 정도" 라 근거를 같이 적는다.
import { formatPrice } from "@/lib/currency";
import type { Forecast } from "@/lib/sales/forecast";
import type { Currency } from "@/server/db/schema";

const M = {
  title: "할인 예측",
  running: (name: string) => `지금 ${name} 진행 중`,
  daysUntil: (name: string, n: number) => `${name}까지 약 ${n}일`,
  confirmed: "공지된 일정",
  estimated: "예년 일정으로 추정",
  noDate: "이 플랫폼은 세일 일정을 아직 예측하지 않아요",
  expected: "예상 가격",
  expectedNote: "역대 최저가 기준",
  noRecord: "할인 기록이 아직 없어요",
} as const;

export function DiscountForecast({ forecast, currency }: { forecast: Forecast; currency: Currency }) {
  return (
    <section aria-labelledby="forecast-heading" className="flex flex-col gap-2.5 border-t border-line pt-4">
      <h2 id="forecast-heading" className="text-[13px] font-semibold text-dim">
        {M.title}
      </h2>
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1 rounded-xl bg-surface-2 px-3.5 py-3">
          {forecast.sale ? (
            <>
              <span className="text-[15px] font-bold text-ink">{forecast.sale.running ? M.running(forecast.sale.name) : M.daysUntil(forecast.sale.name, forecast.sale.daysUntil)}</span>
              <span className="text-[12px] text-dim">{forecast.sale.confirmed ? M.confirmed : M.estimated}</span>
            </>
          ) : (
            <span className="text-[13px] text-mut">{M.noDate}</span>
          )}
        </div>
        <div className="flex flex-col gap-1 rounded-xl bg-surface-2 px-3.5 py-3">
          <span className="text-[12px] text-dim">{M.expected}</span>
          {forecast.expectedPrice !== null ? (
            <>
              <span className="text-[17px] font-black tabular-nums text-acc">{formatPrice(forecast.expectedPrice, currency)}</span>
              <span className="text-[12px] text-dim">{M.expectedNote}</span>
            </>
          ) : (
            <span className="text-[13px] text-mut">{M.noRecord}</span>
          )}
        </div>
      </div>
    </section>
  );
}
