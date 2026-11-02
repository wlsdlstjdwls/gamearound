import { describe, expect, it } from "vitest";
import { emailPlainText, renderEmail, renderEmailSubject } from "./email";

describe("renderEmail", () => {
  it("변수를 채우고 줄바꿈을 <br> 로, 태그에 인라인 스타일을 단다", () => {
    const r = renderEmail("<b>{제목}</b>\n<a href=\"{링크}\">열기</a>", { 제목: "A < B", 링크: "https://x.kr/a?b=1&c=2" });
    expect(r.body).toBe('<b>A &lt; B</b>\n<a href="https://x.kr/a?b=1&amp;c=2">열기</a>');
    expect(r.html).toContain("<b>A &lt; B</b><br><a style=");
    expect(r.html.startsWith("<div style=")).toBe(true);
  });
  it("pre 안 줄바꿈은 그대로 둔다", () => {
    expect(renderEmail("<pre>a\nb</pre>\nc", {}).html).toMatch(/<pre style="[^"]+">a\nb<\/pre><br>c/);
  });
  it("허용 밖 태그는 글자로 남는다", () => {
    expect(renderEmail("<script>x</script>", {}).html).toContain("&lt;script&gt;");
  });
});

describe("emailPlainText", () => {
  it("태그를 걷고 링크는 글자 (주소) 로 푼다", () => {
    expect(emailPlainText('<b>제목</b>\n<a href="https://x.kr">열기</a> &amp; 끝')).toBe("제목\n열기 (https://x.kr) & 끝");
  });
  it("글자가 주소와 같으면 한 번만", () => {
    expect(emailPlainText('<a href="https://x.kr">https://x.kr</a>')).toBe("https://x.kr");
  });
});

describe("renderEmailSubject", () => {
  it("값을 이스케이프하지 않고 공백을 한 칸으로", () => {
    expect(renderEmailSubject("[손전등]  {제목}", { 제목: "A & B <특가>" })).toBe("[손전등] A & B <특가>");
  });
});
