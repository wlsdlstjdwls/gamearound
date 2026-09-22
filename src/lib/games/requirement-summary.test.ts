import { describe, expect, it } from "vitest";
import { requirementSummary, type RequirementSummaryInput } from "./requirement-summary";

const win = (minimum: RequirementSummaryInput["minimum"], recommended: RequirementSummaryInput["recommended"] = null): RequirementSummaryInput => ({
  osFamily: "windows",
  minimum,
  recommended,
});

describe("requirementSummary", () => {
  it("최소 사양을 프로세서, 그래픽, 메모리 순으로 잇는다", () => {
    const line = requirementSummary([win({ cpuText: "Intel Core i5-4430", gpuText: "NVIDIA GeForce GTX 960", ramMb: 8192 })]);
    expect(line).toBe("최소 Intel Core i5-4430 | NVIDIA GeForce GTX 960 | 8 GB");
  });

  // 스토어는 대안을 나열한다. 한 줄 요약에 둘을 다 실으면 제목 줄이 통째로 접힌다
  it("대안 나열은 첫 후보만 쓴다", () => {
    const line = requirementSummary([
      win({ cpuText: "Core i5-4430 / AMD FX-6300", gpuText: "GeForce GTX 960 2GB or Radeon R7 370", ramMb: null }),
    ]);
    expect(line).toBe("최소 Core i5-4430 | GeForce GTX 960 2GB");
  });

  it("최소가 없으면 권장으로 말하고 그 사실을 앞에 적는다", () => {
    const line = requirementSummary([win(null, { cpuText: "Core i7-8700", gpuText: null, ramMb: 16384 })]);
    expect(line).toBe("권장 Core i7-8700 | 16 GB");
  });

  // 판정 마디가 답하는 질문이 "내 PC" 라 윈도우가 먼저다. 맥 전용 게임은 있는 것을 쓴다
  it("윈도우 사양을 먼저 고른다", () => {
    const line = requirementSummary([
      { osFamily: "mac", minimum: { cpuText: "Apple M1", gpuText: null, ramMb: null }, recommended: null },
      win({ cpuText: "Core i5-4430", gpuText: null, ramMb: null }),
    ]);
    expect(line).toBe("최소 Core i5-4430");
  });

  it("아는 값이 하나도 없으면 줄을 세우지 않는다", () => {
    expect(requirementSummary([])).toBeNull();
    expect(requirementSummary([win({ cpuText: null, gpuText: null, ramMb: null })])).toBeNull();
  });
});
