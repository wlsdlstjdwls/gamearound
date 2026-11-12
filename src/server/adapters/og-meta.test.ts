import { describe, expect, it } from "vitest";
import { parsePageMeta } from "./og-meta";

describe("parsePageMeta", () => {
  it("og 태그를 읽고 엔티티를 푼다", () => {
    const html = `<head><title>무시</title>
      <meta property="og:title" content="피크민 4 &amp; 계획력 테스트 | 닌텐도">
      <meta property="og:description" content="당신의 계획력을 측정해 보세요!">
      <meta property="og:image" content="https://www.nintendo.com/kr/games/switch2/ampyc/sns.png"></head>`;
    expect(parsePageMeta(html, "https://www.nintendo.com/kr/games/switch2/ampyc/")).toEqual({
      title: "피크민 4 & 계획력 테스트 | 닌텐도",
      description: "당신의 계획력을 측정해 보세요!",
      imageUrl: "https://www.nintendo.com/kr/games/switch2/ampyc/sns.png",
    });
  });

  it("og 가 없으면 title, description 으로 물러서고 상대 이미지를 절대 주소로 바꾼다", () => {
    const html = `<title> 소개 </title><meta name='description' content='설명'><meta name="twitter:image" content="./sns.png"/>`;
    expect(parsePageMeta(html, "https://example.com/a/b/")).toEqual({ title: "소개", description: "설명", imageUrl: "https://example.com/a/b/sns.png" });
  });

  it("아무것도 없으면 전부 null", () => {
    expect(parsePageMeta("<html></html>", "https://example.com")).toEqual({ title: null, description: null, imageUrl: null });
  });
});
