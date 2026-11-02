import { describe, expect, it } from "vitest";
import { hasMarkup, renderWebNotice } from "./web";

describe("renderWebNotice", () => {
  it("값을 그대로 채우고 줄바꿈을 한 칸으로", () => {
    expect(renderWebNotice("찜한 '{게임}'\n{할인율}% 할인", { 게임: "A & B", 할인율: "30" })).toBe("찜한 'A & B' 30% 할인");
  });
  it("값이 없는 변수는 그대로 둔다", () => {
    expect(renderWebNotice("{게임} 출시", {})).toBe("{게임} 출시");
  });
});

describe("hasMarkup", () => {
  it("태그만 잡는다", () => {
    expect(hasMarkup("<b>굵게</b>")).toBe(true);
    expect(hasMarkup("3 < 5 이고 {게임}")).toBe(false);
  });
});
