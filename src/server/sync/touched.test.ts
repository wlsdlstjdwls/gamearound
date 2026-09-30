import { describe, expect, it } from "vitest";
import { noteTouched, touchedForLog, UNKNOWN_FIELD, type TouchedMap } from "./touched";

describe("touched", () => {
  it("같은 게임의 칸은 합치고 기록용 칸은 버린다", () => {
    const m: TouchedMap = new Map();
    noteTouched(m, "a", ["currentPrice", "lastSyncedAt"]);
    noteTouched(m, "a", ["coverUrl", "syncStatus"]);
    expect(touchedForLog(m, [])).toEqual([{ slug: "a", fields: ["currentPrice", "coverUrl"] }]);
  });
  it("changedSlugs 에만 있는 게임은 기타로 싣는다", () => {
    const m: TouchedMap = new Map();
    noteTouched(m, "same");
    expect(touchedForLog(m, ["same", "ghost"])).toEqual([
      { slug: "same", fields: [UNKNOWN_FIELD] },
      { slug: "ghost", fields: [UNKNOWN_FIELD] },
    ]);
  });
  it("새로 만든 것, 바뀐 것, 그대로인 것 순", () => {
    const m: TouchedMap = new Map();
    noteTouched(m, "same");
    noteTouched(m, "changed", ["releaseDate"]);
    noteTouched(m, "new", [], true);
    expect(touchedForLog(m, ["new"]).map((i) => i.slug)).toEqual(["new", "changed", "same"]);
  });
});
