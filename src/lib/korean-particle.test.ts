import { describe, expect, it } from "vitest";
import { roParticle } from "./korean-particle";

describe("roParticle", () => {
  it("받침 없음, ㄹ 받침은 로, 그 밖의 받침은 으로", () => {
    expect(roParticle("작업대기")).toBe("로");
    expect(roParticle("할 일")).toBe("로");
    expect(roParticle("처리 중")).toBe("으로");
    expect(roParticle("완료")).toBe("로");
    expect(roParticle("ABC")).toBe("로");
  });
});
