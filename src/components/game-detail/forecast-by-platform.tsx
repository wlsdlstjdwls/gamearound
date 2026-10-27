"use client";
// 할인 예측 판을 고른 플랫폼 값으로 바꿔 끼운다(game-detail/platform-pick, 2026-10-27).
// 예측은 서버가 묶음마다 미리 셈해 넘긴다(lib/sales/forecast 는 순수 함수라 화면에서 다시 셀 수도 있지만,
// 할인 기록 요약이 서버에서 접혀 오므로 같은 자리에서 끝낸다). 고른 묶음이 없으면(전체) 모든 플랫폼을 함께 본 예측이다.
import { DiscountForecast } from "@/components/discount-forecast";
import { usePlatformPick } from "@/components/game-detail/platform-pick";
import type { Forecast } from "@/lib/sales/forecast";
import type { Currency } from "@/server/db/schema";

export function ForecastByPlatform({
  all,
  byBrand,
  labels,
  currency,
  action,
}: {
  all: Forecast | null;
  byBrand: Record<string, Forecast | null>;
  /** 묶음 열쇠 -> 화면 이름(PlayStation) */
  labels: Record<string, string>;
  currency: Currency;
  action?: React.ReactNode;
}) {
  const brand = usePlatformPick()?.brand ?? null;
  const own = brand !== null && brand in byBrand;
  return (
    // 고른 묶음이 바뀌면 판이 한 번 떠오른다 — 값이 바뀌었다는 것을 눈이 놓치지 않게
    <div key={own ? brand : "all"} className="animate-rise">
      <DiscountForecast forecast={own ? byBrand[brand] : all} currency={currency} action={action} basisLabel={own ? labels[brand] : undefined} />
    </div>
  );
}
