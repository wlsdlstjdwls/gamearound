// 크론 몫이 함수 시간 안에 드는지 지키는 테스트 — 네트워크 없이 상수와 어댑터 간격만 본다.
//
// 이 테스트가 있는 이유: CRON_PLAN 의 숫자를 올리는 일은 쉽고, 300초를 넘겼는지는
// 실제로 배포해서 함수가 잘려 봐야 안다. 그 전에 여기서 막는다.
import { describe, expect, it } from "vitest";
import { getStoreAdapter } from "@/server/adapters";
import {
  CRON_MODES,
  type CronMode,
  CRON_DB_MS_PER_ITEM,
  CRON_DB_MS_PER_NEW_ITEM,
  CRON_DB_MS_PER_NEW_ITEM_BY_SOURCE,
  CRON_PLAN,
  CRON_SAFETY_FACTOR,
  CRON_SOURCES,
  CRON_TIME_BUDGET_MS,
  DEFAULT_FETCH_BATCH_SIZE,
  DLC_FETCH_PER_RUN_BY_SOURCE,
  DLC_LIST_PER_RUN,
  DLC_LIST_PER_RUN_BY_SOURCE,
} from "./constants";

/**
 * 한 실행이 걸릴 시간의 어림값 = (요청 시간 + 반영 시간) × 여유.
 *
 * 요청 시간은 "몇 번 나가느냐" 로 센다 — 건수가 아니다. 가격을 배치로 받는 소스는 50건이 요청 1회라
 * 건수로 세면 실제보다 수십 배 크게 나온다. 다만 신규 등록 대상은 배치가 마스터를 안 줘서
 * 단건 상세를 따로 받는 소스가 있고(batchPricesOnly "detail"), 그건 건수만큼 요청이 는다.
 * 반영 시간은 **신규와 갱신을 갈라서** 센다. 신규 1건은 게임 행에 플랫폼, 장르, 이미지까지 딸려서
 * 갱신 1건의 네 배가 넘는다(CRON_DB_MS_PER_NEW_ITEM). 이걸 뭉뚱그렸다가 gog 몫을 283초로 보고
 * 실제 760초를 맞았다 — discover 모드는 seedShare 1 이라 처리 건수가 곧 신규 건수다.
 * 발견 1건이 몇 행을 만드는지는 소스마다 다르다(CRON_DB_MS_PER_NEW_ITEM_BY_SOURCE).
 *
 * 새로 등록되는 DLC 도 같은 값으로 센다. **이 몫을 빼먹으면 예산이 통째로 어긋난다** —
 * 2026-09-15 에 steam 을 549초로 보고 680초를 맞은 원인이 이것이다. 배치 소스는 DLC 상세 요청이
 * 거의 공짜라 상한을 비워 뒀는데, 요청이 공짜인 것이지 반영이 공짜인 게 아니었다(230건이 등록됐다).
 *
 * DLC 단계도 같은 실행 안에서 돈다(sync/run-store 4단계). 두 축을 따로 센다 —
 * 본편에게 목록을 묻는 요청과, 그 결과로 받은 새 DLC 의 상세 요청이다.
 * 뒤엣것은 배치 조회가 있는 소스에서는 거의 공짜지만 epic 처럼 fetchMany 가 없는 소스에서는 건당 1회다.
 * 이 몫을 빼놓고 세면 테스트는 통과하는데 실제 함수는 300초에 잘린다.
 */
function estimateMs(source: (typeof CRON_SOURCES)[number], mode: CronMode): number {
  const plan = CRON_PLAN[source][mode];
  const adapter = getStoreAdapter(source);
  // match 모드는 runSource 를 아예 부르지 않는다(route 의 limit 0 분기) — 목록 페이지도 DLC 단계도 없다.
  // 드는 것은 검색뿐이고, 한 건이 최대 두 번 나간다(영문 제목, 한국어 제목. match.ts 의 searchBestCandidate).
  if (mode === "match") {
    return (plan.match * 2 * adapter.minIntervalMs + plan.match * CRON_DB_MS_PER_ITEM) * CRON_SAFETY_FACTOR;
  }
  const detailItems = adapter.batchPricesOnly === "detail" ? plan.seedTop : 0;
  const batchedItems = Math.max(plan.limit - detailItems, 0);
  const perRequest = adapter.fetchMany ? (adapter.batchSize ?? DEFAULT_FETCH_BATCH_SIZE) : 1;

  // DLC 목록을 물어볼 줄 모르는 어댑터는 이 단계를 아예 건너뛴다.
  // 두 메서드를 다 봐야 한다 — 마스터까지 주는 소스(nintendo_jp)는 listDlcCandidates 쪽에만 있다
  const listsDlcs = Boolean(adapter.listDlcIds ?? adapter.listDlcCandidates);
  const dlcListRequests = listsDlcs ? (DLC_LIST_PER_RUN_BY_SOURCE[source] ?? DLC_LIST_PER_RUN) : 0;
  const dlcFetchItems = listsDlcs ? (DLC_FETCH_PER_RUN_BY_SOURCE[source] ?? 0) : 0;
  const dlcFetchRequests = Math.ceil(dlcFetchItems / perRequest);

  const requests =
    plan.pageBudget + plan.match + detailItems + Math.ceil(batchedItems / perRequest) + dlcListRequests + dlcFetchRequests;
  // 새로 들어오는 것(시드 + 새 DLC)과 이미 아는 것을 갈라 센다
  const newItems = plan.seedTop + dlcFetchItems;
  const updatedItems = Math.max(plan.limit - plan.seedTop, 0);
  const newItemMs = CRON_DB_MS_PER_NEW_ITEM_BY_SOURCE[source] ?? CRON_DB_MS_PER_NEW_ITEM;
  const applyMs = newItems * newItemMs + updatedItems * CRON_DB_MS_PER_ITEM;
  return (requests * adapter.minIntervalMs + applyMs) * CRON_SAFETY_FACTOR;
}

describe("CRON_PLAN", () => {
  for (const source of CRON_SOURCES) {
    for (const mode of CRON_MODES) {
      it(`${source} ${mode} 몫이 요청 시간 예산 안에 든다`, () => {
        expect(estimateMs(source, mode)).toBeLessThanOrEqual(CRON_TIME_BUDGET_MS);
      });
    }
  }

  // 2026-09-15: steam 이 한 실행에 새 DLC 230건을 등록해 680초를 썼다. dlc-writer 는 상한이
  // undefined 면 나온 만큼 전부 등록한다 — 배치 소스라고 비워 두면 최악 1,800건까지 열린다.
  it("DLC 목록을 묻는 크론 소스는 새 DLC 등록 상한이 있다 — 비우면 무제한이다", () => {
    for (const source of CRON_SOURCES) {
      const adapter = getStoreAdapter(source);
      if (!(adapter.listDlcIds ?? adapter.listDlcCandidates)) continue;
      expect(DLC_FETCH_PER_RUN_BY_SOURCE[source]).toBeGreaterThan(0);
    }
  });

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
