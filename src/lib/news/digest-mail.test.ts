// 주간 소식 메일 기사 카드 — 값 이스케이프, 링크, 많이 다룬 소식 칸
import { describe, expect, it } from "vitest";
import { DIGEST_MAIL_SUMMARY_MAX, digestMailBlock, type DigestMailItem } from "@/lib/news/digest-mail";
import { NEWS_DIGEST_TRENDING_MESSAGES as T } from "@/lib/news/messages";

const item = (over: Partial<DigestMailItem> = {}): DigestMailItem => ({
  title: "하데스 II <새 무기>",
  url: "https://news.example/a?x=1&y=2",
  sourceName: "IGN",
  thumbnailUrl: "https://img.example/a.jpg",
  summary: "요약",
  gameTitle: "하데스 II",
  gameUrl: "https://gamearound.kr/games/hades-ii",
  publishedAt: new Date("2026-11-03T00:00:00Z"),
  ...over,
});

describe("digestMailBlock", () => {
  it("제목, 썸네일은 원문 링크, 게임 이름은 상세 링크. 값은 이스케이프한다", () => {
    const { html, text } = digestMailBlock([item()], []);
    expect(html).toContain('href="https://news.example/a?x=1&amp;y=2"');
    expect(html).toContain("하데스 II &lt;새 무기&gt;");
    expect(html).toContain('src="https://img.example/a.jpg"');
    expect(html).toContain('href="https://gamearound.kr/games/hades-ii"');
    expect(html).toContain("IGN | ");
    expect(text).toBe("- 하데스 II <새 무기> (IGN, 하데스 II)\n  https://news.example/a?x=1&y=2");
  });
  it("썸네일이 없으면 그림 칸을 두지 않고, 긴 요약은 자른다", () => {
    const { html } = digestMailBlock([item({ thumbnailUrl: null, summary: "가".repeat(DIGEST_MAIL_SUMMARY_MAX + 50) })], []);
    expect(html).not.toContain("<img");
    expect(html).toContain(`${"가".repeat(DIGEST_MAIL_SUMMARY_MAX - 1)}…`);
  });
  it("많이 다룬 소식은 머리말을 달아 가른다", () => {
    const { html, text } = digestMailBlock([item()], [item({ title: "붉은사막 출시일" })]);
    expect(html).toContain(T.trendingTitle);
    expect(text).toContain(`[${T.trendingTitle}]`);
    expect(digestMailBlock([item()], []).html).not.toContain(T.trendingTitle);
  });
});
