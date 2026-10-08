import { describe, expect, it } from "vitest";
import { GAUGE_CELLS, ONBOARDING_STEPS, isStep, litCells, nextStep, prevStep, stepProgress, visibleSteps, type StepContext } from "./steps";

const ctx: StepContext = { platforms: null };
const pc: StepContext = { platforms: ["steam", "ps5"] };

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
  it("PC 를 고르면 정의된 순서대로 전부 이어진다", () => {
    const walked: string[] = ["intro"];
    let cur = nextStep("intro", pc);
    while (cur) {
      walked.push(cur);
      cur = nextStep(cur, pc);
    }
    expect(walked).toEqual([...ONBOARDING_STEPS]);
  });

  it("PC 를 안 고르면 기기 단계를 건너뛴다 — 콘솔만 쓰는 사람에게 CPU 를 묻지 않는다", () => {
    const consoleOnly: StepContext = { platforms: ["ps5", "switch"] };
    expect(nextStep("platforms", consoleOnly)).toBe("genres");
    expect(prevStep("genres", consoleOnly)).toBe("platforms");
    expect(nextStep("platforms", ctx)).toBe("genres");
  });

  it("기기 단계에 선 채 PC 를 지우면 뒤로 물러서지 않고 앞으로 보낸다", () => {
    expect(nextStep("device", ctx)).toBe("genres");
    expect(prevStep("device", ctx)).toBe("platforms");
  });

  it("알림 단계는 기기와 상관없이 결과 바로 앞에 선다 — 무엇을 알려 줄지 정한 뒤에 권한을 묻는다", () => {
    for (const c of [ctx, pc]) {
      expect(nextStep("subscriptions", c)).toBe("notify");
      expect(nextStep("notify", c)).toBe("done");
    }
  });

  it("마지막 뒤에는 없다 — 여기서 null 이 아니면 결과 화면이 자기 자신으로 돈다", () => {
    expect(nextStep("done", ctx)).toBeNull();
  });

  it("첫 단계 앞에는 없다 — 뒤로 버튼을 그릴지 정하는 값이다", () => {
    expect(prevStep("intro", ctx)).toBeNull();
    expect(prevStep("platforms", ctx)).toBe("intro");
  });

  it("앞뒤가 서로를 되짚는다", () => {
    for (const c of [ctx, pc]) {
      for (const s of visibleSteps(c)) {
        const n = nextStep(s, c);
        if (n) expect(prevStep(n, c)).toBe(s);
      }
    }
  });
});

describe("stepProgress", () => {
  it("intro 는 0, done 은 1", () => {
    expect(stepProgress("intro", ctx)).toBe(0);
    expect(stepProgress("done", ctx)).toBe(1);
  });

  it("뒤로 가지 않는다 — 막대가 줄면 사람이 진행을 잃었다고 읽는다", () => {
    for (const c of [ctx, pc]) {
      const seen = visibleSteps(c).map((s) => stepProgress(s, c));
      for (let i = 1; i < seen.length; i += 1) expect(seen[i]).toBeGreaterThan(seen[i - 1]);
    }
  });

  it("0 과 1 사이에 머문다", () => {
    for (const s of ONBOARDING_STEPS) {
      const p = stepProgress(s, ctx);
      expect(p).toBeGreaterThanOrEqual(0);
      expect(p).toBeLessThanOrEqual(1);
    }
  });
});

describe("litCells", () => {
  it("단계마다 적어도 한 칸은 더 켜진다 — 눌렀는데 게이지가 그대로면 안 넘어간 줄 안다", () => {
    for (const c of [ctx, pc]) {
      const seen = visibleSteps(c).map((s) => litCells(s, c));
      for (let i = 1; i < seen.length; i += 1) expect(seen[i]).toBeGreaterThan(seen[i - 1]);
    }
  });

  it("intro 는 0칸, done 은 전부", () => {
    expect(litCells("intro", ctx)).toBe(0);
    expect(litCells("done", pc)).toBe(GAUGE_CELLS);
  });
});
