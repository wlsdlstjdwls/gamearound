// 인디 홍보 글 검증 테스트 — 순수 함수만(AGENTS §8).
import { describe, expect, it } from "vitest";
import { indieImagePrefix, indiePostSchema, isHttpsUrl, isOwnIndieImagePath, parseYoutubeId } from "./schemas";

const POST = "0f8fad5b-d9cb-469f-a165-70867728950e";
const OTHER = "7c9e6679-7425-40de-944b-e07fc1f90ae7";
const VID = "dQw4w9WgXcQ";

describe("parseYoutubeId", () => {
  it("흔한 주소 꼴에서 영상 ID 를 꺼낸다", () => {
    expect(parseYoutubeId(`https://www.youtube.com/watch?v=${VID}&t=10s`)).toBe(VID);
    expect(parseYoutubeId(`https://youtu.be/${VID}?si=abc`)).toBe(VID);
    expect(parseYoutubeId(`https://youtube.com/shorts/${VID}`)).toBe(VID);
    expect(parseYoutubeId(`https://m.youtube.com/embed/${VID}`)).toBe(VID);
    expect(parseYoutubeId(`  https://www.youtube.com/watch?v=${VID}  `)).toBe(VID);
  });

  it("유튜브가 아니거나 ID 꼴이 아니면 null", () => {
    expect(parseYoutubeId(`https://evil.com/watch?v=${VID}`)).toBeNull();
    expect(parseYoutubeId("https://www.youtube.com/watch?v=short")).toBeNull();
    expect(parseYoutubeId(`javascript:alert(1)//youtu.be/${VID}`)).toBeNull();
    expect(parseYoutubeId("그냥 글")).toBeNull();
  });
});

describe("isHttpsUrl", () => {
  it("https 만 받는다", () => {
    expect(isHttpsUrl("https://store.steampowered.com/app/1")).toBe(true);
    expect(isHttpsUrl("http://example.com")).toBe(false);
    expect(isHttpsUrl("javascript:alert(1)")).toBe(false);
    expect(isHttpsUrl("data:text/html,x")).toBe(false);
  });
});

describe("isOwnIndieImagePath", () => {
  it("이 글 아래 파일 하나만 통과한다", () => {
    expect(isOwnIndieImagePath(`${indieImagePrefix(POST)}a.webp`, POST)).toBe(true);
    expect(isOwnIndieImagePath(`${indieImagePrefix(OTHER)}a.webp`, POST)).toBe(false);
    expect(isOwnIndieImagePath(`${indieImagePrefix(POST)}x/a.webp`, POST)).toBe(false);
    expect(isOwnIndieImagePath(indieImagePrefix(POST), POST)).toBe(false);
  });
});

describe("indiePostSchema", () => {
  const base = {
    title: "  작은 숲  ",
    tagline: "숲을 가꾸는 게임",
    developerName: "한 사람 스튜디오",
    body: "숲을 가꾸고 동물을 맞이하는 느긋한 게임이에요. 지금은 데모를 만들고 있어요.",
    stage: "demo",
    platforms: ["pc", "pc", "switch"],
    releaseNote: "",
    youtube: "",
    links: [{ kind: "store", url: "https://store.steampowered.com/app/1" }],
    gameId: null,
  };

  it("앞뒤 공백을 다듬고 빈 선택값을 null 로, 플랫폼 중복을 접는다", () => {
    const r = indiePostSchema.parse(base);
    expect(r.title).toBe("작은 숲");
    expect(r.releaseNote).toBeNull();
    expect(r.youtube).toBeNull();
    expect(r.platforms).toEqual(["pc", "switch"]);
  });

  it("유튜브 주소는 ID 로 바꾸고, 못 읽으면 막는다", () => {
    expect(indiePostSchema.parse({ ...base, youtube: `https://youtu.be/${VID}` }).youtube).toBe(VID);
    expect(indiePostSchema.safeParse({ ...base, youtube: "https://vimeo.com/1" }).success).toBe(false);
  });

  it("https 가 아닌 링크와 플랫폼 없음은 막는다", () => {
    expect(indiePostSchema.safeParse({ ...base, links: [{ kind: "site", url: "javascript:alert(1)" }] }).success).toBe(false);
    expect(indiePostSchema.safeParse({ ...base, platforms: [] }).success).toBe(false);
  });
});
