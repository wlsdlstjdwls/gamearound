import { describe, expect, it } from "vitest";
import { splitPostBody } from "./post-body";

describe("splitPostBody", () => {
  it("에디터 HTML 과 첨부 묶음을 가른다", () => {
    const body = '<p>안녕</p><div data-attachments=""><a href="https://x.test/a.pdf" data-file="" data-size="1.2MB">기획서 &amp; 표.pdf</a><a href="https://x.test/b.zip" data-file="" data-size="3KB" target="_blank" rel="noopener">b.zip</a></div>';
    expect(splitPostBody(body)).toEqual({
      html: "<p>안녕</p>",
      files: [
        { url: "https://x.test/a.pdf", name: "기획서 & 표.pdf", sizeLabel: "1.2MB" },
        { url: "https://x.test/b.zip", name: "b.zip", sizeLabel: "3KB" },
      ],
    });
  });

  it("첨부가 없으면 본문 그대로", () => {
    expect(splitPostBody("<p>그냥 글</p>")).toEqual({ html: "<p>그냥 글</p>", files: [] });
  });

  it("옛 글자 본문은 문단 HTML 로 바꾸고 태그를 이스케이프한다", () => {
    expect(splitPostBody("첫 줄\n둘째 줄\n\n<b>새 문단</b>")).toEqual({ html: "<p>첫 줄<br>둘째 줄</p><p>&lt;b&gt;새 문단&lt;/b&gt;</p>", files: [] });
  });
});
