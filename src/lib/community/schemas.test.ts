import { describe, expect, it } from "vitest";
import { postInputSchema } from "@/lib/community/schemas";

const base = { title: "제목", body: "본문" };
const issuePaths = (input: Record<string, string>) => {
  const r = postInputSchema.safeParse(input);
  return r.success ? [] : r.error.issues.map((i) => String(i.path[0]));
};

describe("postInputSchema 관련 게임", () => {
  it("리뷰, 공략은 관련 게임이 없으면 막는다", () => {
    expect(issuePaths({ ...base, category: "review", spoiler: "no" })).toEqual(["gameSlug"]);
    expect(issuePaths({ ...base, category: "guide" })).toEqual(["gameSlug"]);
  });

  it("고른 게임이 있으면 통과한다", () => {
    expect(issuePaths({ ...base, category: "guide", gameSlug: "elden-ring" })).toEqual([]);
  });

  it("홍보는 게임 없이도 된다", () => {
    expect(issuePaths({ ...base, category: "promo", promoType: "my_game" })).toEqual([]);
  });

  it("라운지 글은 게임 칸을 묻지 않는다", () => {
    expect(issuePaths({ ...base, category: "devlog" })).toEqual([]);
  });
});
