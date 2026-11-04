import { describe, expect, it } from "vitest";
import { buildPlanRows, descendantIds, indent, insertAfter, moveSibling, outdent, planState, resizeItem, shiftItem, spanDays, type PlanItem } from "./plan";

const item = (id: string, over: Partial<PlanItem> = {}): PlanItem => ({
  id,
  parentId: null,
  sortOrder: 0,
  title: id,
  track: "dev",
  kind: "task",
  startOn: null,
  endOn: null,
  progress: null,
  assigneeId: null,
  memo: null,
  ...over,
});

describe("buildPlanRows", () => {
  const items = [
    item("g1", { sortOrder: 0 }),
    item("a", { parentId: "g1", sortOrder: 1, startOn: "2026-11-09", endOn: "2026-11-18", progress: 100 }),
    item("b", { parentId: "g1", sortOrder: 0, startOn: "2026-11-01", endOn: "2026-11-10" }),
    item("g2", { sortOrder: 1 }),
    item("m", { parentId: "g2", kind: "milestone", startOn: "2026-12-18", endOn: "2026-12-30" }),
  ];

  it("깊이 우선 순서로 번호를 매긴다", () => {
    const rows = buildPlanRows(items);
    expect(rows.map((r) => `${r.no} ${r.id}`)).toEqual(["1 g1", "1.1 b", "1.2 a", "2 g2", "2.1 m"]);
    expect(rows.find((r) => r.id === "b")?.depth).toBe(1);
  });

  it("상위 기간은 하위의 처음과 끝, 진행률은 기간 가중 평균", () => {
    const g1 = buildPlanRows(items).find((r) => r.id === "g1")!;
    expect([g1.start, g1.end]).toEqual(["2026-11-01", "2026-11-18"]);
    // b 10일 0%, a 10일 100% → 50
    expect(g1.pct).toBe(50);
    expect(g1.pctFrom).toBe("children");
  });

  it("이정표는 끝을 시작과 같게 그린다", () => {
    const m = buildPlanRows(items).find((r) => r.id === "m")!;
    expect([m.start, m.end]).toEqual(["2026-12-18", "2026-12-18"]);
  });

  it("손 값이 없으면 이은 카드의 끝난 비율", () => {
    const rows = buildPlanRows(items, new Map([["b", { total: 4, done: 1 }]]));
    expect(rows.find((r) => r.id === "b")).toMatchObject({ pct: 25, pctFrom: "cards" });
  });

  it("상위가 없는 줄은 맨 위로, 순환은 끊는다", () => {
    const rows = buildPlanRows([item("x", { parentId: "gone" }), item("p", { parentId: "q" }), item("q", { parentId: "p" })]);
    expect(rows.map((r) => r.id)).toContain("x");
  });
});

describe("planState", () => {
  it("끝 > 지연 > 진행 > 예정", () => {
    expect(planState({ start: "2026-11-01", end: "2026-11-03", pct: 100 }, "2026-11-04")).toBe("done");
    expect(planState({ start: "2026-11-01", end: "2026-11-03", pct: 50 }, "2026-11-04")).toBe("late");
    expect(planState({ start: "2026-11-01", end: "2026-11-30", pct: 0 }, "2026-11-04")).toBe("doing");
    expect(planState({ start: "2026-11-09", end: "2026-11-30", pct: 0 }, "2026-11-04")).toBe("todo");
  });
});

describe("줄 옮기기", () => {
  const base = () => [item("a", { sortOrder: 0 }), item("b", { sortOrder: 1 }), item("c", { sortOrder: 2 }), item("c1", { parentId: "c", sortOrder: 0 })];
  const order = (xs: PlanItem[]) => buildPlanRows(xs).map((r) => `${r.no}:${r.id}`).join(" ");

  it("형제 안에서 위아래", () => {
    expect(order(moveSibling(base(), "b", -1))).toBe("1:b 2:a 3:c 3.1:c1");
    expect(moveSibling(base(), "a", -1)).toEqual(base());
  });

  it("들여쓰기는 위 형제의 마지막 하위, 내어쓰기는 상위 바로 다음", () => {
    const ind = indent(base(), "b");
    expect(order(ind)).toBe("1:a 1.1:b 2:c 2.1:c1");
    expect(order(outdent(ind, "b"))).toBe("1:a 2:b 3:c 3.1:c1");
    expect(order(outdent(base(), "c1"))).toBe("1:a 2:b 3:c 4:c1");
  });

  it("새 줄은 고른 줄 바로 아래 형제", () => {
    expect(order(insertAfter(base(), item("n"), "c1"))).toBe("1:a 2:b 3:c 3.1:c1 3.2:n");
    expect(order(insertAfter(base(), item("n"), "a"))).toBe("1:a 2:n 3:b 4:c 4.1:c1");
  });

  it("하위 전부", () => {
    expect([...descendantIds(base(), "c")]).toEqual(["c1"]);
  });
});

describe("끌기", () => {
  it("옮기기와 늘이기", () => {
    const t = item("t", { startOn: "2026-11-09", endOn: "2026-11-13" });
    expect(shiftItem(t, 3)).toMatchObject({ startOn: "2026-11-12", endOn: "2026-11-16" });
    expect(resizeItem(t, "end", 2).endOn).toBe("2026-11-15");
    expect(resizeItem(t, "start", 10).startOn).toBe("2026-11-13");
    expect(spanDays("2026-11-09", "2026-11-13")).toBe(5);
  });
});

describe("요약", () => {
  it("갈래별 진행률은 잎 줄의 기간 가중 평균, 다음 이정표는 오늘 뒤 가장 가까운 것", async () => {
    const { trackSummaries, nextMilestone } = await import("./plan");
    const rows = buildPlanRows([
      item("g", { track: "plan" }),
      item("a", { parentId: "g", track: "plan", startOn: "2026-11-01", endOn: "2026-11-10", progress: 100 }),
      item("b", { parentId: "g", track: "plan", startOn: "2026-11-01", endOn: "2026-11-02", progress: 20 }),
      item("m1", { kind: "milestone", startOn: "2026-11-03" }),
      item("m2", { kind: "milestone", startOn: "2026-12-01" }),
    ]);
    const plan = trackSummaries(rows, "2026-11-05").find((s) => s.track === "plan")!;
    expect(plan).toMatchObject({ pct: 87, total: 2, done: 1, late: 1 });
    expect(nextMilestone(rows, "2026-11-05")?.id).toBe("m2");
  });
});

describe("담당자별", () => {
  it("담당은 상위에서 물려받고, 사람별로 잎 줄을 시작일 순으로 묶는다", async () => {
    const { groupByAssignee } = await import("./plan");
    const rows = buildPlanRows([
      item("dev", { assigneeId: "kim" }),
      item("d2", { parentId: "dev", sortOrder: 1, startOn: "2026-11-01", endOn: "2026-11-02" }),
      item("d1", { parentId: "dev", sortOrder: 0, startOn: "2026-11-10", endOn: "2026-11-12", assigneeId: "ahn" }),
      item("x", { startOn: "2026-11-03", endOn: "2026-11-03" }),
    ]);
    const g = groupByAssignee(rows, "2026-11-05", ["ahn", "kim"]);
    expect(g.map((p) => [p.assigneeId, p.rows.map((r) => r.id)])).toEqual([
      ["ahn", ["d1"]],
      ["kim", ["d2"]],
      [null, ["x"]],
    ]);
    expect(g[1]!.late).toBe(1);
  });
});

describe("끌어 놓기", () => {
  it("대상의 앞뒤 형제로 옮기고 상위는 대상을 따른다, 자기 하위로는 못 간다", async () => {
    const { placeNear } = await import("./plan");
    const base = [item("a", { sortOrder: 0 }), item("b", { sortOrder: 1 }), item("c", { sortOrder: 2 }), item("c1", { parentId: "c", sortOrder: 0 })];
    const order = (xs: PlanItem[]) => buildPlanRows(xs).map((r) => `${r.no}:${r.id}`).join(" ");
    expect(order(placeNear(base, "a", "c", "after"))).toBe("1:b 2:c 2.1:c1 3:a");
    expect(order(placeNear(base, "a", "c1", "before"))).toBe("1:b 2:c 2.1:a 2.2:c1");
    expect(order(placeNear(base, "c1", "a", "before"))).toBe("1:c1 2:a 3:b 4:c");
    expect(placeNear(base, "c", "c1", "before")).toEqual(base);
  });
});

describe("하위로 넣기", () => {
  it("대상의 맨 끝 하위로, 이정표와 자기 하위 안은 거절", async () => {
    const { placeInside } = await import("./plan");
    const base = [item("a", { sortOrder: 0 }), item("b", { sortOrder: 1 }), item("m", { sortOrder: 2, kind: "milestone" }), item("b1", { parentId: "b", sortOrder: 0 })];
    const order = (xs: PlanItem[]) => buildPlanRows(xs).map((r) => `${r.no}:${r.id}`).join(" ");
    expect(order(placeInside(base, "a", "b"))).toBe("1:b 1.1:b1 1.2:a 2:m");
    expect(placeInside(base, "a", "m")).toEqual(base);
    expect(placeInside(base, "b", "b1")).toEqual(base);
  });
});
