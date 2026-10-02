// RSS/Atom 파서 테스트 — fixture 기반, 네트워크 없음
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { AdapterError } from "./types";
import { parseFeed, RSS_FEEDS } from "./news-rss";

const fixture = (name: string): string => readFileSync(fileURLToPath(new URL(`./__fixtures__/${name}`, import.meta.url)), "utf8");
const NOW = new Date("2026-09-11T00:00:00Z");

describe("parseFeed 제목 엔티티", () => {
  it("두 겹 인코딩된 제목을 글자로 푼다(게임메카 실측)", () => {
    const xml = `<?xml version="1.0"?><rss><channel><item><title>&amp;#039;셀린&amp;#039; 열린다 &amp;quot;주 5일&amp;quot;</title><link>https://www.gamemeca.com/view.php?gid=1</link></item></channel></rss>`;
    expect(parseFeed(xml, "게임메카", NOW)[0].title).toBe(`'셀린' 열린다 "주 5일"`);
  });
});

describe("parseFeed (RSS 2.0)", () => {
  const items = parseFeed(fixture("rss-feed.xml"), "Example", NOW);

  it("링크 없는 항목은 건너뛰고 나머지를 NewsItem 으로 변환", () => {
    expect(items).toHaveLength(3);
    expect(items.every((i) => i.sourceName === "Example")).toBe(true);
  });

  it("CDATA 제목, pubDate ISO 변환, media:thumbnail 우선", () => {
    expect(items[0].title).toBe("Cyberpunk 2077 gets a 50% discount on Steam");
    expect(items[0].url).toBe("https://news.example.com/cyberpunk-discount");
    expect(items[0].publishedAt).toBe("2026-09-08T10:15:00.000Z");
    expect(items[0].thumbnailUrl).toBe("https://cdn.example.com/thumb1.jpg");
  });

  it("enclosure(image/*) 를 썸네일로 사용", () => {
    expect(items[1].thumbnailUrl).toBe("https://cdn.example.com/enclosure2.jpg");
    expect(items[1].publishedAt).toBe("2026-09-07T08:00:00.000Z");
  });

  it("description 의 첫 <img> 를 썸네일로, 날짜 없으면 now 로 대체", () => {
    expect(items[2].title).toBe("Only description image & no date");
    expect(items[2].thumbnailUrl).toBe("https://cdn.example.com/inline3.png");
    expect(items[2].publishedAt).toBe(NOW.toISOString());
  });

  it("본문(description)은 저장 대상이 아니다 (§10)", () => {
    for (const it of items) expect(Object.keys(it).sort()).toEqual(["publishedAt", "sourceName", "thumbnailUrl", "title", "url"]);
  });
});

describe("parseFeed (Atom)", () => {
  const items = parseFeed(fixture("atom-feed.xml"), "Atom", NOW);

  it("rel=alternate 링크와 published 를 사용", () => {
    expect(items).toHaveLength(2);
    expect(items[0].url).toBe("https://atom.example.com/silksong-review");
    expect(items[0].publishedAt).toBe("2026-09-05T12:00:00.000Z");
    expect(items[0].thumbnailUrl).toBe("https://cdn.example.com/atom1.jpg");
  });

  it("published 없으면 updated, rel 없는 link 도 허용", () => {
    expect(items[1].url).toBe("https://atom.example.com/second");
    expect(items[1].publishedAt).toBe("2026-09-04T09:30:00.000Z");
    expect(items[1].thumbnailUrl).toBeUndefined();
  });
});

describe("parseFeed (오류)", () => {
  it("지원하지 않는 형식이면 AdapterError", () => {
    expect(() => parseFeed("<html><body>not a feed</body></html>", "x")).toThrowError(AdapterError);
  });
  it("피드 목록에는 이름이 중복되지 않는다", () => {
    expect(new Set(RSS_FEEDS.map((f) => f.name)).size).toBe(RSS_FEEDS.length);
  });
});
