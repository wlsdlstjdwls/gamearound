import { describe, expect, it } from "vitest";
import { emailPlainText, renderEmail, renderEmailSubject, withEmailBlocks, wrapEmailHtml } from "./email";

describe("renderEmail", () => {
  it("변수를 채우고 줄바꿈을 <br> 로, 태그에 인라인 스타일을 단다", () => {
    const r = renderEmail("<b>{제목}</b>\n<a href=\"{링크}\">열기</a>", { 제목: "A < B", 링크: "https://x.kr/a?b=1&c=2" });
    expect(r.body).toBe('<b>A &lt; B</b>\n<a href="https://x.kr/a?b=1&amp;c=2">열기</a>');
    // 첫 줄 굵은 글은 제목으로, 혼자 한 줄인 링크는 단추로(email-shell)
    expect(r.html).toContain(">A &lt; B</div>");
    expect(r.html).toMatch(/<td style="border-radius:10px;background:#2563eb"><a href="https:\/\/x\.kr\/a\?b=1&amp;c=2" style="[^"]+">열기<\/a>/);
    expect(r.html.startsWith("<div style=")).toBe(true);
  });
  it("줄 가운데 링크와 주소 그대로인 링크는 단추로 만들지 않는다", () => {
    const html = renderEmail('앞 <a href="https://x.kr">설정</a> 뒤\n<a href="https://x.kr">https://x.kr</a>', {}).html;
    expect(html).not.toContain("border-radius:10px;background");
    expect(html).toContain('<a style="color:#2563eb;text-decoration:underline" href="https://x.kr">설정</a>');
  });
  it("손전등 이름과 바닥 안내로 감싼다", () => {
    const html = renderEmail("본문", {}).html;
    expect(html).toContain("손전등</span>");
    expect(html).toContain("답장을 받을 수 없어요");
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

describe("덩어리 자리(EmailBlock)", () => {
  const block = { html: '<table><tr><td><a href="https://x.kr" style="color:red">카드</a></td></tr></table>', text: "- 카드 (https://x.kr)" };
  it("{이름} 자리에 덩어리를 넣고, 덩어리 안은 인라인 스타일과 줄바꿈을 건드리지 않는다", () => {
    const r = renderEmail("머리\n{목록}\n끝", { 목록: undefined }, { 목록: block });
    expect(r.html).toContain('<a href="https://x.kr" style="color:red">카드</a>');
    expect(r.html).not.toContain('<a style=');
    expect(r.html).not.toContain("{목록}");
    // 덩어리 앞뒤 줄바꿈 하나는 <br> 로 바꾸지 않는다
    expect(r.html).toContain("머리<!--mail-block-->");
    expect(r.text).toBe("머리\n- 카드 (https://x.kr)\n끝");
  });
  it("덩어리가 없으면 {이름} 그대로 — 빠뜨린 것을 글에서 찾는다", () => {
    expect(renderEmail("{목록}", {}).html).toContain("{목록}");
  });
  it("미리 보기도 같은 모양(withEmailBlocks + wrapEmailHtml)", () => {
    expect(wrapEmailHtml(withEmailBlocks("{목록}", { 목록: block }))).toBe(renderEmail("{목록}", {}, { 목록: block }).html);
  });
});
