// 주간 소식 메일 기사 카드 — 카드 한 장이 우리 사이트 링크 하나, 값 이스케이프, 많이 다룬 소식 칸
import { describe, expect, it } from "vitest";
import { DIGEST_MAIL_SUMMARY_MAX, digestMailBlock, type DigestMailItem } from "@/lib/news/digest-mail";
import { NEWS_DIGEST_TRENDING_MESSAGES as T } from "@/lib/news/messages";

const LINK = "https://gamearound.kr/games/hades-ii?x=1&y=2#news";
const item = (over: Partial<DigestMailItem> = {}): DigestMailItem => ({
  title: "하데스 II <새 무기>",
  link: LINK,
  sourceName: "IGN",
  thumbnailUrl: "https://img.example/a.jpg",
  summary: "요약",
  gameTitle: "하데스 II",
  publishedAt: new Date("2026-11-03T00:00:00Z"),
  ...over,
});

describe("digestMailBlock", () => {
  it("카드 한 장이 우리 사이트 링크 하나다. 값은 이스케이프한다", () => {
    const { html, text } = digestMailBlock([item()], []);
    expect(html.match(/<a /g)).toHaveLength(1);
    expect(html).toContain('href="https://gamearound.kr/games/hades-ii?x=1&amp;y=2#news"');
    expect(html).toContain("하데스 II &lt;새 무기&gt;");
    expect(html).toContain('src="https://img.example/a.jpg"');
    // 게임은 딱지로, 매체와 날짜는 그 옆에. 그림이 있는 맨 앞 기사는 큰 카드다
    expect(html).toContain(">하데스 II</span>&nbsp;&nbsp;IGN | ");
    expect(html).toContain("width:100%");
    expect(text).toBe(`- 하데스 II <새 무기> (IGN, 하데스 II)\n  ${LINK}`);
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
