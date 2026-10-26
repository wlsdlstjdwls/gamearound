import { describe, expect, it } from "vitest";
import { distinct, groupAlertsByGame, toggleTargets, type GroupableAlert } from "./group";

const alert = (id: string, gameId: string, o: Partial<Omit<GroupableAlert, "id" | "game">> = {}): GroupableAlert => ({
  id,
  game: { id: gameId },
  isActive: true,
  status: { met: false, best: { price: 1 } },
  ...o,
});

describe("groupAlertsByGame", () => {
  it("같은 게임의 행을 한 묶음으로, 처음 나온 순서대로 묶는다", () => {
    const groups = groupAlertsByGame([alert("a", "g1"), alert("b", "g2"), alert("c", "g1")]);
    expect(groups.map((g) => g.gameId)).toEqual(["g1", "g2"]);
    expect(groups[0].items.map((v) => v.id)).toEqual(["a", "c"]);
  });
  it("하나라도 켜져 있으면 켜진 묶음이다", () => {
    const [g] = groupAlertsByGame([alert("a", "g1", { isActive: false }), alert("b", "g1")]);
    expect(g.isActive).toBe(true);
    const [off] = groupAlertsByGame([alert("a", "g1", { isActive: false })]);
    expect(off.isActive).toBe(false);
  });
  it("대표 행은 켜진 것 중 조건에 맞는 행이 먼저, 꺼 둔 충족 행은 고르지 않는다", () => {
    const [g] = groupAlertsByGame([
      alert("off-met", "g1", { isActive: false, status: { met: true, best: {} } }),
      alert("on", "g1"),
      alert("on-met", "g1", { status: { met: true, best: {} } }),
    ]);
    expect(g.lead.id).toBe("on-met");
    const [h] = groupAlertsByGame([alert("off-met", "g1", { isActive: false, status: { met: true, best: {} } }), alert("on", "g1")]);
    expect(h.lead.id).toBe("on");
  });
  it("값을 아는 행이 없으면 첫 행이 대표다", () => {
    const [g] = groupAlertsByGame([alert("a", "g1", { status: { met: false, best: null } }), alert("b", "g1", { status: { met: false, best: null } })]);
    expect(g.lead.id).toBe("a");
  });
});

describe("toggleTargets", () => {
  const items = [
    { id: "a", isActive: true },
    { id: "b", isActive: false },
  ];
  it("목표 상태와 다른 행만 뒤집는다", () => {
    expect(toggleTargets(items, false)).toEqual(["a"]);
    expect(toggleTargets(items, true)).toEqual(["b"]);
  });
});

describe("distinct", () => {
  it("처음 나온 순서를 지키며 겹친 값을 뺀다", () => {
    expect(distinct(["web", "email", "web"])).toEqual(["web", "email"]);
  });
});
