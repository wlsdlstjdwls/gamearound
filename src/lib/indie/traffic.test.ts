import { describe, expect, it } from "vitest";
import { classifyTraffic } from "./traffic";

const own = "sonjeondeung.vercel.app";
const c = (referer: string | null, from: "hof" | "rookies" | "mine" | null = null) => classifyTraffic({ from, referer, ownHost: own });

describe("classifyTraffic", () => {
  it("from 이 Referer 보다 먼저다", () => {
    expect(c(`https://${own}/`, "hof")).toBe("hall_of_fame");
    expect(c(null, "rookies")).toBe("rookies");
  });
  it("Referer 가 없으면 직접 들어옴", () => {
    expect(c(null)).toBe("direct");
  });
  it("우리 사이트는 경로 첫 마디로 가른다", () => {
    expect(c(`https://${own}/`)).toBe("home");
    expect(c(`https://${own}/indie?stage=dev`)).toBe("indie_list");
    expect(c(`https://${own}/board/promos`)).toBe("board");
    expect(c(`https://${own}/lounge`)).toBe("board");
    expect(c(`https://${own}/games/hades`)).toBe("game");
    expect(c(`https://${own}/indie/other-game`)).toBe("internal");
    expect(c(`https://${own}/settings`)).toBe("internal");
  });
  it("바깥은 호스트 마디로 가른다", () => {
    expect(c("https://www.google.co.kr/")).toBe("search_engine");
    expect(c("https://m.search.naver.com/search.naver?query=x")).toBe("search_engine");
    expect(c("https://www.youtube.com/watch?v=1")).toBe("youtube");
    expect(c("https://t.co/abc")).toBe("sns");
    expect(c("https://x.com/a")).toBe("sns");
    expect(c("https://box.com/")).toBe("external");
    expect(c("https://store.steampowered.com/")).toBe("external");
  });
  it("읽지 못하는 주소는 바깥", () => {
    expect(c("not a url")).toBe("external");
  });
});
