// 크론 몫이 함수 시간 안에 드는지 지키는 테스트 — 네트워크 없이 상수와 어댑터 간격만 본다.
//
// 이 테스트가 있는 이유: CRON_PLAN 의 숫자를 올리는 일은 쉽고, 300초를 넘겼는지는
// 실제로 배포해서 함수가 잘려 봐야 안다. 그 전에 여기서 막는다.
import { describe, expect, it } from "vitest";
import { getStoreAdapter } from "@/server/adapters";
import { CRON_DB_MS_PER_ITEM, CRON_PLAN, CRON_SAFETY_FACTOR, CRON_SOURCES, CRON_TIME_BUDGET_MS, DEFAULT_FETCH_BATCH_SIZE } from "./constants";

/**
 * 한 실행이 걸릴 시간의 어림값 = (요청 시간 + 반영 시간) × 여유.
 *
 * 요청 시간은 "몇 번 나가느냐" 로 센다 — 건수가 아니다. 가격을 배치로 받는 소스는 50건이 요청 1회라
 * 건수로 세면 실제보다 수십 배 크게 나온다. 다만 신규 등록 대상은 배치가 마스터를 안 줘서
 * 단건 상세를 따로 받는 소스가 있고(batchPricesOnly "detail"), 그건 건수만큼 요청이 는다.
 * 반영 시간은 소스와 무관하게 건당 CRON_DB_MS_PER_ITEM 이다(그 상수의 근거 주석 참고).
 */
function estimateMs(source: (typeof CRON_SOURCES)[number], mode: "prices" | "discover"): number {
  const plan = CRON_PLAN[source][mode];
  const adapter = getStoreAdapter(source);
  const detailItems = adapter.batchPricesOnly === "detail" ? plan.seedTop : 0;
  const batchedItems = Math.max(plan.limit - detailItems, 0);
  const perRequest = adapter.fetchMany ? (adapter.batchSize ?? DEFAULT_FETCH_BATCH_SIZE) : 1;
  const requests = plan.pageBudget + plan.match + detailItems + Math.ceil(batchedItems / perRequest);
  return (requests * adapter.minIntervalMs + plan.limit * CRON_DB_MS_PER_ITEM) * CRON_SAFETY_FACTOR;
}

describe("CRON_PLAN", () => {
  for (const source of CRON_SOURCES) {
    for (const mode of ["prices", "discover"] as const) {
      it(`${source} ${mode} 몫이 요청 시간 예산 안에 든다`, () => {
        expect(estimateMs(source, mode)).toBeLessThanOrEqual(CRON_TIME_BUDGET_MS);
      });
    }
  }

  it("prices 모드는 발견을 돌지 않는다 — 가격 갱신만 하라고 나눈 모드다", () => {
    for (const source of CRON_SOURCES) {
      expect(CRON_PLAN[source].prices.seedTop).toBe(0);
      expect(CRON_PLAN[source].prices.pageBudget).toBe(0);
    }
  });

  // 시간을 정하는 것은 limit 이다. seedTop 은 그 안에서 신규와 기존 갱신의 배분만 바꾸므로
  // limit 을 넘지만 않으면 시간 예산과 무관하다.
  it("discover 모드의 신규 몫은 배치를 넘지 않는다", () => {
    for (const source of CRON_SOURCES) {
      const { seedTop, limit } = CRON_PLAN[source].discover;
      expect(seedTop).toBeGreaterThan(0);
      expect(seedTop).toBeLessThanOrEqual(limit);
    }
  });

  it("discover 모드는 시드 몫 제한을 푼다 — 기존 갱신은 prices 모드가 따로 맡는다", () => {
    for (const source of CRON_SOURCES) {
      expect(CRON_PLAN[source].discover.seedShare).toBe(1);
    }
  });
});
