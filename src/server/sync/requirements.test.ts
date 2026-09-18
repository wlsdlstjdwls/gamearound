// 사양 요청 대상 선정 테스트 — 순수 함수만. DB, 네트워크는 건드리지 않는다.
import { describe, expect, it } from "vitest";
import { REQUIREMENTS_REFRESH_DAYS } from "./constants";
import { pickRequirementTargets, type RequirementRow } from "./requirements";

const NOW = new Date("2026-09-18T00:00:00Z");
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 24 * 60 * 60 * 1000);

function row(over: Partial<RequirementRow> = {}): RequirementRow {
  return { id: "p1", gameId: "g1", platform: "steam", storeExternalId: "1245620", requirementsListedAt: null, ...over };
}

const targets = [{ gameId: "g1", slug: "elden-ring" }];

describe("pickRequirementTargets", () => {
  it("한 번도 물어보지 않은 게임을 고른다", () => {
    expect(pickRequirementTargets(targets, [row()], NOW)).toEqual([
      { platformId: "p1", gameId: "g1", platform: "steam", slug: "elden-ring", key: "1245620" },
    ]);
  });

  // 사양은 거의 안 변한다 — 주기가 길수록 한 바퀴 도는 속도를 지킨다
  it("최근에 물어본 게임은 건너뛴다", () => {
    expect(pickRequirementTargets(targets, [row({ requirementsListedAt: daysAgo(REQUIREMENTS_REFRESH_DAYS - 1) })], NOW)).toEqual([]);
  });

  it("주기가 지난 게임은 다시 고른다", () => {
    expect(pickRequirementTargets(targets, [row({ requirementsListedAt: daysAgo(REQUIREMENTS_REFRESH_DAYS + 1) })], NOW)).toHaveLength(1);
  });

  it("한 번도 안 물어본 게임이 먼저다 — 사양이 아예 없는 게임부터 줄여야 한다", () => {
    const rows = [
      row({ id: "p-old", gameId: "g-old", requirementsListedAt: daysAgo(REQUIREMENTS_REFRESH_DAYS + 10) }),
      row({ id: "p-new", gameId: "g-new" }),
    ];
    const both = [{ gameId: "g-old", slug: "old" }, { gameId: "g-new", slug: "new" }];
    expect(pickRequirementTargets(both, rows, NOW, 1).map((p) => p.gameId)).toEqual(["g-new"]);
  });

  it("질의 키가 없는 행은 물어볼 데가 없다", () => {
    expect(pickRequirementTargets(targets, [row({ storeExternalId: null })], NOW)).toEqual([]);
  });

  it("같은 게임의 플랫폼 행이 여럿이면 하나만 묻는다", () => {
    const rows = [row({ id: "p1" }), row({ id: "p2" })];
    expect(pickRequirementTargets(targets, rows, NOW)).toHaveLength(1);
  });

  it("상한을 넘지 않는다", () => {
    const rows = [row({ id: "p1", gameId: "g1" }), row({ id: "p2", gameId: "g2" }), row({ id: "p3", gameId: "g3" })];
    const three = [{ gameId: "g1", slug: "a" }, { gameId: "g2", slug: "b" }, { gameId: "g3", slug: "c" }];
    expect(pickRequirementTargets(three, rows, NOW, 2)).toHaveLength(2);
  });
});
