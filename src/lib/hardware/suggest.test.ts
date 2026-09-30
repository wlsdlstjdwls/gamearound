import { describe, expect, it } from "vitest";
import { suggestModels } from "./suggest";
import { normalizeModelKey } from "./normalize";

const opt = (name: string) => ({ key: normalizeModelKey(name), name });
const OPTIONS = ["GeForce RTX 4090", "GeForce RTX 4060 Ti", "GeForce RTX 4060", "Radeon RX 7600", "GeForce GTX 1060 6GB"].map(opt);

describe("suggestModels", () => {
  it("빈 칸이면 사전 순서로 앞에서 자른다", () => {
    expect(suggestModels(OPTIONS, "  ", 2).map((o) => o.name)).toEqual(["GeForce RTX 4090", "GeForce RTX 4060 Ti"]);
  });

  it("띄어쓰기, 대소문자와 상관없이 거른다", () => {
    expect(suggestModels(OPTIONS, "rtx4060", 8).map((o) => o.name)).toEqual(["GeForce RTX 4060 Ti", "GeForce RTX 4060"]);
    expect(suggestModels(OPTIONS, "RTX 4060", 8)).toHaveLength(2);
  });

  it("낱말 순서를 바꿔 쳐도 걸린다", () => {
    expect(suggestModels(OPTIONS, "ti 4060", 8).map((o) => o.name)).toEqual(["GeForce RTX 4060 Ti"]);
  });

  it("첫 낱말로 시작하는 이름을 앞에 세운다", () => {
    expect(suggestModels(OPTIONS, "1060", 8).map((o) => o.name)).toEqual(["GeForce GTX 1060 6GB"]);
    expect(suggestModels(OPTIONS, "rx 7600", 8).map((o) => o.name)).toEqual(["Radeon RX 7600"]);
  });

  it("상한만큼만 준다", () => {
    expect(suggestModels(OPTIONS, "rtx", 1)).toHaveLength(1);
  });
});
