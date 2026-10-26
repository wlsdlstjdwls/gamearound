import { describe, expect, it } from "vitest";
import { isPostId, postPath, requiresGame, takesGame } from "@/lib/community/constants";

const ID = "0b6f7a52-2f7e-4b8e-9a51-2a3c1d4e5f60";

describe("postPath", () => {
  it("게시판 글은 제 게시판 목록 아래에 선다", () => {
    expect(postPath(ID, "review")).toBe(`/board/reviews/p/${ID}`);
    expect(postPath(ID, "guide")).toBe(`/board/guides/p/${ID}`);
    expect(postPath(ID, "promo")).toBe(`/board/promos/p/${ID}`);
  });
  it("라운지 글은 그대로 /lounge/p", () => {
    expect(postPath(ID, "devlog")).toBe(`/lounge/p/${ID}`);
  });
});

describe("관련 게임 규칙", () => {
  it("리뷰, 공략은 필수, 홍보는 선택, 라운지는 없음", () => {
    expect([requiresGame("review"), requiresGame("guide"), requiresGame("promo")]).toEqual([true, true, false]);
    expect([takesGame("promo"), takesGame("devlog"), takesGame("qna")]).toEqual([true, false, false]);
  });
});

describe("isPostId", () => {
  it("uuid 꼴만 받는다", () => {
    expect(isPostId(ID)).toBe(true);
    expect(isPostId("abc")).toBe(false);
  });
});
