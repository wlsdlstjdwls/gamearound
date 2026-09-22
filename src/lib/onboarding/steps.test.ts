import { describe, expect, it } from "vitest";
import { ONBOARDING_STEPS, isStep, nextStep, prevStep, stepProgress, visibleSteps, type StepContext } from "./steps";

const ctx: StepContext = { platforms: null };

describe("isStep", () => {
  it("아는 단계만 통과시킨다", () => {
    expect(isStep("platforms")).toBe(true);
    expect(isStep("done")).toBe(true);
  });

  it("주소를 손으로 친 값은 막는다", () => {
    expect(isStep("platform")).toBe(false);
    expect(isStep("")).toBe(false);
    expect(isStep("../admin")).toBe(false);
  });
});

describe("nextStep / prevStep", () => {
  it("정의된 순서대로 이어진다", () => {
    const walked: string[] = ["intro"];
    let cur = nextStep("intro", ctx);
    while (cur) {
      walked.push(cur);
      cur = nextStep(cur, ctx);
    }
    expect(walked).toEqual([...ONBOARDING_STEPS]);
  });

  it("마지막 뒤에는 없다 — 여기서 null 이 아니면 결과 화면이 자기 자신으로 돈다", () => {
    expect(nextStep("done", ctx)).toBeNull();
  });

  it("첫 단계 앞에는 없다 — 뒤로 버튼을 그릴지 정하는 값이다", () => {
    expect(prevStep("intro", ctx)).toBeNull();
    expect(prevStep("platforms", ctx)).toBe("intro");
  });

  it("앞뒤가 서로를 되짚는다", () => {
    for (const s of ONBOARDING_STEPS) {
      const n = nextStep(s, ctx);
      if (n) expect(prevStep(n, ctx)).toBe(s);
    }
  });
});

describe("stepProgress", () => {
  it("intro 는 0, done 은 1", () => {
    expect(stepProgress("intro", ctx)).toBe(0);
    expect(stepProgress("done", ctx)).toBe(1);
  });

  it("뒤로 가지 않는다 — 막대가 줄면 사람이 진행을 잃었다고 읽는다", () => {
    const seen = visibleSteps(ctx).map((s) => stepProgress(s, ctx));
    for (let i = 1; i < seen.length; i += 1) expect(seen[i]).toBeGreaterThan(seen[i - 1]);
  });

  it("0 과 1 사이에 머문다", () => {
    for (const s of ONBOARDING_STEPS) {
      const p = stepProgress(s, ctx);
      expect(p).toBeGreaterThanOrEqual(0);
      expect(p).toBeLessThanOrEqual(1);
    }
  });
});
