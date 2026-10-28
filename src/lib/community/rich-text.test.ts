import { describe, expect, it } from "vitest";
import { hasPostImage, isRichBody, richPlainText } from "@/lib/community/rich-text";
import { sanitizePostHtml } from "@/lib/community/sanitize";

const BLOB = "https://abc.public.blob.vercel-storage.com/posts/shot-x1.webp";

describe("isRichBody", () => {
  it("에디터가 낸 블록으로 시작하면 HTML 이다", () => {
    expect(isRichBody("<p>안녕</p>")).toBe(true);
    expect(isRichBody("  <h2>제목</h2>")).toBe(true);
  });
  it("옛 글자 글은 HTML 이 아니다", () => {
    expect(isRichBody("그냥 글이에요\n<b>굵게</b>")).toBe(false);
    expect(isRichBody("<script>alert(1)</script>")).toBe(false);
  });
});

describe("sanitizePostHtml", () => {
  it("스크립트와 이벤트 속성을 걷는다", () => {
    const out = sanitizePostHtml('<p onclick="x()">a<script>alert(1)</script></p><img src="x" onerror="y()">');
    expect(out).not.toMatch(/script|onclick|onerror/);
  });
  it("javascript: 링크를 걷고 링크에 새 창, nofollow 를 붙인다", () => {
    expect(sanitizePostHtml('<p><a href="javascript:alert(1)">x</a></p>')).not.toMatch(/javascript/);
    const out = sanitizePostHtml('<p><a href="https://ex.com" target="_self" rel="x">x</a></p>');
    expect(out).toContain('target="_blank"');
    expect(out).toContain("nofollow");
  });
  it("우리 저장소 그림만 남긴다", () => {
    expect(sanitizePostHtml(`<p><img src="${BLOB}" alt="a"></p>`)).toContain(BLOB);
    expect(sanitizePostHtml('<p><img src="https://evil.com/posts/a.png"></p>')).not.toContain("<img");
    expect(sanitizePostHtml('<p><img src="http://abc.public.blob.vercel-storage.com/posts/a.webp"></p>')).not.toContain("<img");
  });
  it("허용하지 않은 태그는 글자만 남긴다", () => {
    expect(sanitizePostHtml('<p><span style="color:red">빨강</span></p>')).toBe("<p>빨강</p>");
  });
  it("첨부 묶음 표시는 남는다", () => {
    expect(sanitizePostHtml('<div data-attachments=""><a href="https://ex.com/a.pdf" data-file="" data-size="1 MB">a.pdf</a></div>')).toContain("data-attachments");
  });
});

describe("richPlainText", () => {
  it("태그를 걷고 블록 사이를 줄바꿈으로 둔다", () => {
    expect(richPlainText("<h2>제목</h2><p>본문 <strong>굵게</strong></p>")).toBe("제목\n본문 굵게");
  });
  it("빈 문단만 있으면 빈 글자다", () => {
    expect(richPlainText("<p></p>")).toBe("");
  });
});

describe("hasPostImage", () => {
  it("그림이 있는지 본다", () => {
    expect(hasPostImage(`<p><img src="${BLOB}"></p>`)).toBe(true);
    expect(hasPostImage("<p>글</p>")).toBe(false);
  });
});
