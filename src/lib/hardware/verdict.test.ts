// 판정 테스트 — 순수 함수만. 규칙의 근거는 설계 문서 §6 과 verdict.ts 머리 주석에 있다.
import { describe, expect, it } from "vitest";
import { findModel } from "./index";
import { judge, requiredTier, type DeviceSpec, type RequirementSpec } from "./verdict";

const keyOf = (kind: "cpu" | "gpu", name: string) => findModel(kind, name)!.key;

function device(over: Partial<DeviceSpec> = {}): DeviceSpec {
  return {
    cpuModelKey: keyOf("cpu", "Core i5 8400"),
    gpuModelKey: keyOf("gpu", "GeForce GTX 1060 6GB"),
    ramMb: 16384,
    storageFreeMb: 500 * 1024,
    ...over,
  };
}

function spec(over: Partial<RequirementSpec> = {}): RequirementSpec {
  return { cpuTiers: [6], gpuTiers: [7], ramMb: 8192, storageMb: 50 * 1024, ...over };
}

describe("requiredTier", () => {
  // "GTX 1060 또는 RX 580" 은 둘 중 하나만 넘으면 되므로 요구선은 쉬운 쪽이다
  it("후보 중 가장 낮은 티어가 요구선이다", () => {
    expect(requiredTier([12, 9, 14])).toBe(9);
  });

  it("사전에서 못 찾은 후보는 무시한다 — 아는 후보가 있으면 판정은 할 수 있다", () => {
    expect(requiredTier([null, 9])).toBe(9);
  });

  it("아는 후보가 하나도 없으면 null 이다", () => {
    expect(requiredTier([null, null])).toBeNull();
    expect(requiredTier([])).toBeNull();
  });
});

describe("judge", () => {
  it("전부 넘으면 권장 충족", () => {
    const v = judge(device(), spec(), spec({ cpuTiers: [8], gpuTiers: [9], ramMb: 16384 }));
    expect(v.overall).toBe("meets_recommended");
    expect(v.hasUnknown).toBe(false);
  });

  it("최소는 넘고 권장은 못 넘으면 최소 충족", () => {
    const v = judge(device(), spec(), spec({ gpuTiers: [17] }));
    expect(v.overall).toBe("meets_minimum");
  });

  it("한 부위라도 못 미치면 최소 미만이고, 그 부위를 집어 준다", () => {
    const v = judge(device({ ramMb: 4096 }), spec(), null);
    expect(v.overall).toBe("below_minimum");
    expect(v.parts.find((p) => p.slot === "ram")?.status).toBe("below");
    // 나머지 부위는 그대로 충족이라고 말한다 — "불가" 한 마디보다 병목을 집는 편이 쓸모 있다
    expect(v.parts.find((p) => p.slot === "gpu")?.status).toBe("meets");
  });

  // 티어는 "비슷한 급" 이라는 뜻이라 한 칸 차이를 단정하지 않는다
  it("같은 티어는 충족으로 본다", () => {
    const gpuTier = findModel("gpu", "GeForce GTX 1060 6GB")!.tier;
    const v = judge(device(), spec({ gpuTiers: [gpuTier] }), null);
    expect(v.parts.find((p) => p.slot === "gpu")?.status).toBe("meets");
  });

  it("모르는 부품은 판정에서 빼되 전체에 단서를 남긴다", () => {
    const v = judge(device({ gpuModelKey: null }), spec(), null);
    expect(v.parts.find((p) => p.slot === "gpu")?.status).toBe("unknown");
    expect(v.hasUnknown).toBe(true);
    // 나머지가 넘었으면 결론은 최소 충족이다. 모르는 한 항목 때문에 답을 접지 않는다
    expect(v.overall).toBe("meets_minimum");
  });

  it("아는 것이 하나도 없으면 판정 불가다 — 조용히 통과시키지 않는다", () => {
    const empty = { cpuModelKey: null, gpuModelKey: null, ramMb: null, storageFreeMb: null };
    expect(judge(empty, spec(), null).overall).toBe("unknown");
  });

  // 권장 사양이 없는 게임이 흔하다(표본 60건 중 11건)
  it("권장 사양이 없으면 최대 결론은 최소 충족이다", () => {
    expect(judge(device(), spec(), null).overall).toBe("meets_minimum");
  });

  // 간이 폼이 저장공간을 안 받는다 — 우리가 안 물어본 값을 "안 적어 두셨어요" 로 되묻지 않는다
  it("저장공간을 안 적은 기기에는 저장공간 줄을 세우지 않는다", () => {
    const v = judge(device({ storageFreeMb: null }), spec(), null);
    expect(v.parts.find((p) => p.slot === "storage")).toBeUndefined();
    expect(v.hasUnknown).toBe(false);
  });

  it("저장공간을 적어 둔 기기에는 그대로 견준다", () => {
    const v = judge(device({ storageFreeMb: 1024 }), spec(), null);
    expect(v.parts.find((p) => p.slot === "storage")?.status).toBe("below");
  });

  it("스토어가 요구값을 안 적은 부위는 모른다고 한다", () => {
    const v = judge(device(), spec({ ramMb: null, cpuTiers: [], gpuTiers: [] }), null);
    expect(v.parts.find((p) => p.slot === "ram")?.reason).toBe("no-requirement");
    expect(v.parts.find((p) => p.slot === "cpu")?.reason).toBe("no-requirement");
  });
});
