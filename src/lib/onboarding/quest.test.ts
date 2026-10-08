import { describe, expect, it } from "vitest";
import { filledSlots, isSlotStep, playerTitle, questNodes, SLOT_STEPS } from "./quest";
import type { StepContext } from "./steps";

const empty = { platforms: null, favoriteGenreIds: null, dealStyle: null, playTimeStyle: null, subscriptionKeys: null };
const consoleOnly: StepContext = { platforms: ["ps5"] };
const pc: StepContext = { platforms: ["steam"] };

describe("filledSlots", () => {
  it("빈 배열은 채운 것으로 치지 않는다", () => {
    expect(filledSlots({ ...empty, platforms: [], subscriptionKeys: [] })).toEqual([]);
  });

  it("슬롯 순서대로 돌려준다", () => {
    expect(filledSlots({ ...empty, subscriptionKeys: ["gamepass"], platforms: ["steam"], dealStyle: "wait_deep" })).toEqual([
      "platforms",
      "deal-style",
      "subscriptions",
    ]);
  });
});

describe("questNodes", () => {
  it("intro 는 칸이 아니고, intro 에서는 전부 잠겨 있다", () => {
    const nodes = questNodes("intro", consoleOnly, []);
    expect(nodes.some((n) => n.step === "intro")).toBe(false);
    expect(nodes.every((n) => n.state === "locked")).toBe(true);
  });

  it("지나온 슬롯은 답이 있으면 cleared, 없으면 skipped", () => {
    const nodes = questNodes("deal-style", consoleOnly, ["platforms"]);
    expect(nodes.slice(0, 3)).toEqual([
      { step: "platforms", state: "cleared" },
      { step: "genres", state: "skipped" },
      { step: "deal-style", state: "current" },
    ]);
    expect(nodes.at(-1)).toEqual({ step: "done", state: "locked" });
  });

  it("기기 칸은 PC 를 고른 사람에게만 생기고, 슬롯이 아니라 지나가면 cleared", () => {
    expect(questNodes("genres", consoleOnly, []).some((n) => n.step === "device")).toBe(false);
    expect(questNodes("genres", pc, ["platforms"]).find((n) => n.step === "device")?.state).toBe("cleared");
  });

  it("결과에 닿으면 마지막 칸도 밝다", () => {
    expect(questNodes("done", pc, []).at(-1)).toEqual({ step: "done", state: "cleared" });
  });
});

describe("playerTitle", () => {
  it("두 답으로 칭호를 만든다", () => {
    expect(playerTitle({ dealStyle: "historic_low", playTimeStyle: "endless" })).toBe("최저가를 노리는 무한 도전자");
  });

  it("건너뛴 질문도 칭호가 선다", () => {
    expect(playerTitle({ dealStyle: null, playTimeStyle: null })).toBe("자유로운 게이머");
  });
});

describe("isSlotStep", () => {
  it("답이 저장되는 단계만 슬롯이다", () => {
    expect(SLOT_STEPS.every(isSlotStep)).toBe(true);
    expect(isSlotStep("device")).toBe(false);
    expect(isSlotStep("notify")).toBe(false);
  });
});
