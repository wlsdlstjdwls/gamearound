import { describe, expect, it } from "vitest";
import { summarizeProfile, SUMMARY_LABELS } from "./summary";

const names = {
  genres: [
    { id: 1, name: "액션" },
    { id: 2, name: "RPG" },
  ],
  subscriptions: [{ key: "gamepass", label: "게임 패스" }],
};

const empty = { platforms: null, favoriteGenreIds: null, dealStyle: null, playTimeStyle: null, subscriptionKeys: null };

describe("summarizeProfile", () => {
  it("아무것도 안 답했으면 줄이 없다", () => {
    expect(summarizeProfile(empty, names)).toEqual([]);
  });

  it("답한 칸만 순서대로", () => {
    const rows = summarizeProfile(
      { platforms: ["steam", "ps5"], favoriteGenreIds: [2, 1], dealStyle: "wait_deep", playTimeStyle: null, subscriptionKeys: ["gamepass"] },
      names,
    );
    expect(rows.map((r) => r.label)).toEqual([SUMMARY_LABELS.platforms, SUMMARY_LABELS.genres, SUMMARY_LABELS.dealStyle, SUMMARY_LABELS.subscriptions]);
    expect(rows[0].value).toBe("Steam, PS5");
    expect(rows[1].value).toBe("RPG, 액션");
    expect(rows[3].value).toBe("게임 패스");
  });

  it("이름을 못 찾은 값은 뺀다", () => {
    expect(summarizeProfile({ ...empty, favoriteGenreIds: [99], subscriptionKeys: ["gone"] }, names)).toEqual([]);
  });
});
