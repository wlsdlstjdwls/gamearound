// 크론 몫이 함수 시간 안에 드는지 지키는 테스트 — 네트워크 없이 상수와 어댑터 간격만 본다.
//
// 이 테스트가 있는 이유: CRON_PLAN 의 숫자를 올리는 일은 쉽고, 300초를 넘겼는지는
// 실제로 배포해서 함수가 잘려 봐야 안다. 그 전에 여기서 막는다.
import { describe, expect, it } from "vitest";
import { getStoreAdapter } from "@/server/adapters";
import { CRON_OVERHEAD_FACTOR, CRON_PLAN, CRON_SOURCES, CRON_TIME_BUDGET_MS } from "./constants";

/**
 * 한 실행이 걸릴 시간의 어림값 = (목록 페이지 + 대상 건수 + 매칭 검색) × 요청 간격 × 실측 보정 계수.
 * 대상 1건이 요청 2회인 경우(언어 2회 조회 등)는 어댑터가 간격의 절반만 쉬므로 여기서는 1건으로 센다.
 * 보정 계수가 반영(DB 왕복)과 알림 몫을 담당한다 — 그 값의 근거는 CRON_OVERHEAD_FACTOR 주석에 있다.
 */
function estimateMs(source: (typeof CRON_SOURCES)[number], mode: "prices" | "discover"): number {
  const plan = CRON_PLAN[source][mode];
  const interval = getStoreAdapter(source).minIntervalMs;
  return (plan.pageBudget + plan.limit + plan.match) * interval * CRON_OVERHEAD_FACTOR[source];
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

  it("discover 모드의 신규 몫은 배치의 절반을 넘지 않는다 — 나머지 절반은 기존 갱신 몫이다", () => {
    for (const source of CRON_SOURCES) {
      const { seedTop, limit } = CRON_PLAN[source].discover;
      expect(seedTop).toBeLessThanOrEqual(limit / 2);
    }
  });
});
