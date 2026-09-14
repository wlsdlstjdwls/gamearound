// 구독 포함 판정 테스트 — 순수 함수만. DB 는 건드리지 않는다.
import { describe, expect, it } from "vitest";
import { planSubscriptionChanges, type SubscriptionRow } from "./subscription-writer";

const IDS = new Map([
  ["psplus_special", 10],
  ["psplus_deluxe", 11],
]);

const row = (over: Partial<SubscriptionRow> = {}): SubscriptionRow => ({
  id: 1,
  gamePlatformId: "gp1",
  subscriptionId: 10,
  removedAt: null,
  ...over,
});

describe("planSubscriptionChanges", () => {
  it("새로 포함된 구독은 넣는다", () => {
    const plan = planSubscriptionChanges([{ gamePlatformId: "gp1", slug: "cyberpunk", keys: ["psplus_special"] }], IDS, []);
    expect(plan.inserts).toEqual([{ gamePlatformId: "gp1", subscriptionId: 10 }]);
    expect(plan.changedSlugs).toEqual(["cyberpunk"]);
  });

  it("이미 들어 있으면 아무것도 쓰지 않는다 — 캐시도 깨지 않는다", () => {
    const plan = planSubscriptionChanges([{ gamePlatformId: "gp1", slug: "cyberpunk", keys: ["psplus_special"] }], IDS, [row()]);
    expect(plan).toMatchObject({ inserts: [], revive: [], gone: [], changedSlugs: [] });
  });

  it("빠졌다 돌아오면 되살린다", () => {
    const plan = planSubscriptionChanges(
      [{ gamePlatformId: "gp1", slug: "cyberpunk", keys: ["psplus_special"] }],
      IDS,
      [row({ id: 7, removedAt: new Date("2026-01-01") })],
    );
    expect(plan.revive).toEqual([7]);
    expect(plan.inserts).toEqual([]);
  });

  it("빈 키 목록은 그 게임의 포함을 내린다 — 지우지 않고 removed 로만 표시", () => {
    const plan = planSubscriptionChanges([{ gamePlatformId: "gp1", slug: "cyberpunk", keys: [] }], IDS, [row({ id: 3 })]);
    expect(plan.gone).toEqual([3]);
    expect(plan.changedSlugs).toEqual(["cyberpunk"]);
  });

  it("이번 배치에 없는 게임의 기록은 건드리지 않는다 — 여기가 카탈로그 경로와 갈리는 지점이다", () => {
    const plan = planSubscriptionChanges(
      [{ gamePlatformId: "gp1", slug: "cyberpunk", keys: [] }],
      IDS,
      [row({ id: 3, gamePlatformId: "gp1" }), row({ id: 4, gamePlatformId: "gp-다른게임" })],
    );
    expect(plan.gone).toEqual([3]);
  });

  it("이미 내려간 행을 또 내리지 않는다", () => {
    const plan = planSubscriptionChanges(
      [{ gamePlatformId: "gp1", slug: "cyberpunk", keys: [] }],
      IDS,
      [row({ id: 3, removedAt: new Date("2026-01-01") })],
    );
    expect(plan.gone).toEqual([]);
    expect(plan.changedSlugs).toEqual([]);
  });

  it("한 게임이 구독을 갈아타면 넣기와 내리기가 같이 나온다", () => {
    const plan = planSubscriptionChanges(
      [{ gamePlatformId: "gp1", slug: "cyberpunk", keys: ["psplus_deluxe"] }],
      IDS,
      [row({ id: 3, subscriptionId: 10 })],
    );
    expect(plan.inserts).toEqual([{ gamePlatformId: "gp1", subscriptionId: 11 }]);
    expect(plan.gone).toEqual([3]);
  });

  it("시드에 없는 키는 버리고 사유를 남긴다", () => {
    const plan = planSubscriptionChanges([{ gamePlatformId: "gp1", slug: "cyberpunk", keys: ["ea_play_ps"] }], IDS, []);
    expect(plan.inserts).toEqual([]);
    expect(plan.unknownKeys).toEqual(["ea_play_ps"]);
  });
});
