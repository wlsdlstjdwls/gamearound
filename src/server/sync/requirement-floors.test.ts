// 문턱 접기 테스트 — 순수 함수만. DB, 네트워크는 건드리지 않는다.
import { describe, expect, it } from "vitest";
import { foldFloors, type FloorInput } from "./requirement-floors";

function input(over: Partial<FloorInput> = {}): FloorInput {
  return {
    gameId: "g1", osFamily: "windows", tier: "minimum",
    ramMb: 8192, storageMb: 50_000, cpuTiers: [10], gpuTiers: [12],
    ...over,
  };
}

describe("foldFloors", () => {
  it("최소와 권장을 한 줄에 접는다", () => {
    const [row] = foldFloors([
      input(),
      input({ tier: "recommended", ramMb: 16_384, cpuTiers: [14], gpuTiers: [16] }),
    ]);
    expect(row.minGpuTier).toBe(12);
    expect(row.recGpuTier).toBe(16);
    expect(row.recRamMb).toBe(16_384);
  });

  it("후보 여럿이면 가장 낮은 것이 문턱이다 — 하나만 넘으면 되기 때문", () => {
    const [row] = foldFloors([input({ gpuTiers: [15, 11, 13] })]);
    expect(row.minGpuTier).toBe(11);
  });

  it("사전에서 못 찾은 후보(null)는 무시하고, 전부 null 이면 문턱도 null 이다", () => {
    const [known] = foldFloors([input({ cpuTiers: [null, 9] })]);
    expect(known.minCpuTier).toBe(9);
    const [unknown] = foldFloors([input({ cpuTiers: [null, null] })]);
    expect(unknown.minCpuTier).toBeNull();
  });

  it("스토어가 둘이면 낮은 쪽을 남긴다 — 높은 쪽을 적으면 실제로 도는 게임이 목록에서 사라진다", () => {
    const [row] = foldFloors([input({ gpuTiers: [14], ramMb: 16_384 }), input({ gpuTiers: [10], ramMb: 8192 })]);
    expect(row.minGpuTier).toBe(10);
    expect(row.minRamMb).toBe(8192);
  });

  it("OS 가 다르면 줄이 갈린다", () => {
    const rows = foldFloors([input(), input({ osFamily: "mac" })]);
    expect(rows).toHaveLength(2);
    expect(rows.map((r) => r.osFamily).sort()).toEqual(["mac", "windows"]);
  });

  it("게임이 다르면 섞이지 않는다", () => {
    const rows = foldFloors([input({ gpuTiers: [8] }), input({ gameId: "g2", gpuTiers: [18] })]);
    expect(rows.find((r) => r.gameId === "g1")!.minGpuTier).toBe(8);
    expect(rows.find((r) => r.gameId === "g2")!.minGpuTier).toBe(18);
  });
});
