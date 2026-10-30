import { describe, expect, it } from "vitest";
import { siteSourceOf } from "./visits";

describe("siteSourceOf", () => {
  it("바깥 호스트를 갈래로", () => {
    expect(siteSourceOf("https://www.google.com/", "gamearound.kr")).toBe("search_engine");
    expect(siteSourceOf("https://m.search.naver.com/search.naver?q=x", "gamearound.kr")).toBe("search_engine");
    expect(siteSourceOf("https://www.youtube.com/watch?v=1", "gamearound.kr")).toBe("youtube");
    expect(siteSourceOf("https://t.co/abc", "gamearound.kr")).toBe("sns");
    expect(siteSourceOf("https://ruliweb.com/x", "gamearound.kr")).toBe("external");
  });
  it("Referer 가 없거나 우리 사이트면 주소로 바로", () => {
    expect(siteSourceOf(null, "gamearound.kr")).toBe("direct");
    expect(siteSourceOf("", "gamearound.kr")).toBe("direct");
    expect(siteSourceOf("https://gamearound.kr/games", "gamearound.kr")).toBe("direct");
  });
});
