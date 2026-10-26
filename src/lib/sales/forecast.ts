// 할인 예측(기획서 v2.0 S-05 "다음 할인까지 예상 일수와 예상 가격"). 2026-10-26 사용자와 정한 방식:
//   - 할인은 게임마다 따로 오지 않고 플랫폼 세일에 맞춰 온다 — 그래서 날짜는 그 게임이 있는 플랫폼의 다음 세일이다.
//     지금 일정표가 있는 플랫폼은 스팀뿐이다(lib/sales/calendar). 다른 플랫폼만 있는 게임은 날짜를 말하지 않는다.
//   - 예상 가격은 그 게임의 역대 최저가다(플랫폼이 여럿이면 가장 싼 쪽 하나). 할인 기록이 없으면 가격 자리를 비운다.
// 맞히는 것이 아니라 "기다리면 이 정도" 를 말하는 값이라, 확정 공지가 있는 회차인지(confirmed)를 함께 돌려준다.
import { upcomingSales } from "@/lib/sales/calendar";

export type Forecast = {
  /** 다음 세일. 일정표가 있는 플랫폼에 없으면 null */
  sale: { name: string; daysUntil: number; running: boolean; confirmed: boolean } | null;
  /** 예상 가격(역대 최저가). 기록이 없으면 null */
  expectedPrice: number | null;
};

const DAY_MS = 24 * 60 * 60 * 1000;

export function forecastDiscount(input: { platforms: string[]; recordedLow: number | null; currentLowest: number | null; now: Date }): Forecast | null {
  const onSteam = input.platforms.includes("steam");
  const next = onSteam ? upcomingSales(input.now)[0] : undefined;
  const sale = next
    ? {
        name: next.sale.name,
        daysUntil: next.status === "running" ? 0 : Math.max(1, Math.ceil((next.startsAt.getTime() - input.now.getTime()) / DAY_MS)),
        running: next.status === "running",
        confirmed: next.source === "confirmed",
      }
    : null;
  // 역대 최저가가 지금 값보다 비쌀 수는 없지만(지금이 최저면 기록이 없다), 그때는 지금 값이 곧 기대할 수 있는 값이다
  const expectedPrice = input.recordedLow ?? null;
  if (!sale && expectedPrice === null) return null;
  return { sale, expectedPrice: expectedPrice !== null && input.currentLowest !== null ? Math.min(expectedPrice, input.currentLowest) : expectedPrice };
}
