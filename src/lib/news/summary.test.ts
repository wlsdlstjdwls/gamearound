import { describe, expect, it } from "vitest";
import { newsSummaryOf, NEWS_SUMMARY_MAX } from "./summary";

describe("newsSummaryOf", () => {
  it("HTML 을 벗기고 엔티티를 풀어 한 줄로 만든다", () => {
    expect(newsSummaryOf("<p>Valve has announced &amp; detailed the <b>Steam Machine</b> launch window.</p>")).toBe("Valve has announced & detailed the Steam Machine launch window.");
  });

  it("문단 경계에 빈칸을 남긴다", () => {
    expect(newsSummaryOf("<p>Ocarina of Mine.</p><p>My first ocarina was from a hippy shop.</p>")).toBe("Ocarina of Mine. My first ocarina was from a hippy shop.");
  });

  it("워드프레스 꼬리를 떼어 낸다", () => {
    expect(newsSummaryOf("A new trailer shows off the open world in detail. The post Trailer appeared first on Site.")).toBe("A new trailer shows off the open world in detail.");
  });

  it("너무 짧거나 비면 null", () => {
    expect(newsSummaryOf("Read more")).toBeNull();
    expect(newsSummaryOf(null)).toBeNull();
  });

  it("제목만 되풀이하면 null", () => {
    expect(newsSummaryOf("Hades 2 is out now on Switch 2", "Hades 2 is out now on Switch 2")).toBeNull();
  });

  it("길면 띄어쓰기 자리에서 자르고 말줄임표를 단다", () => {
    const long = "word ".repeat(60);
    const out = newsSummaryOf(long)!;
    expect(out.endsWith("…")).toBe(true);
    expect(out.length).toBeLessThanOrEqual(NEWS_SUMMARY_MAX + 1);
  });
});
