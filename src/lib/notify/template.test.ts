import { describe, expect, it } from "vitest";
import { checkTags, fillVars, renderNotice, sanitizeTelegramHtml, templateVars } from "./template";

describe("templateVars", () => {
  it("한글, 영문 변수를 나온 순서대로 겹침 없이", () => {
    expect(templateVars("{제목} 과 {name_1}, 다시 {제목}")).toEqual(["제목", "name_1"]);
  });
  it("맨 중괄호는 변수가 아니다", () => {
    expect(templateVars("{ } {} {a b}")).toEqual([]);
  });
});

describe("fillVars", () => {
  it("값은 이스케이프하고 없는 변수는 그대로 둔다", () => {
    expect(fillVars("<b>{제목}</b> {없음}", { 제목: "A < B & C" })).toBe("<b>A &lt; B &amp; C</b> {없음}");
  });
});

describe("sanitizeTelegramHtml", () => {
  it("허용 태그는 남기고 나머지 꺾쇠는 글자로", () => {
    expect(sanitizeTelegramHtml("<b>굵게</b> <script>x</script> 1 < 2")).toBe("<b>굵게</b> &lt;script&gt;x&lt;/script&gt; 1 &lt; 2");
  });
  it("이미 바뀐 글자는 다시 바꾸지 않는다", () => {
    expect(sanitizeTelegramHtml("A &amp; B &lt; C & D")).toBe("A &amp; B &lt; C &amp; D");
  });
  it("http 가 아닌 링크는 태그를 글자로 남긴다", () => {
    expect(sanitizeTelegramHtml('<a href="javascript:alert(1)">x</a>')).toBe('&lt;a href="javascript:alert(1)"&gt;x</a>');
    expect(sanitizeTelegramHtml('<a href="https://a.kr/x?a=1&amp;b=2">열기</a>')).toBe('<a href="https://a.kr/x?a=1&amp;b=2">열기</a>');
  });
});

describe("renderNotice", () => {
  it("링크 변수까지 채운 뒤 검사한다", () => {
    expect(renderNotice('<a href="{링크}">카드 열기</a>', { 링크: "https://g.kr/admin/tasks?task=1" })).toBe('<a href="https://g.kr/admin/tasks?task=1">카드 열기</a>');
  });
  it("업무요청 템플릿이 앞 코드가 만들던 글과 같다", () => {
    const body = "🆕 새 할 일\n\n<b>{제목}</b>\n\n<b>분류</b>  {분류}\n\n<a href=\"{링크}\">카드 열기</a>";
    expect(renderNotice(body, { 제목: "A&B", 분류: "버그", 링크: "https://x.kr/t" })).toBe(
      '🆕 새 할 일\n\n<b>A&amp;B</b>\n\n<b>분류</b>  버그\n\n<a href="https://x.kr/t">카드 열기</a>',
    );
  });
});

describe("checkTags", () => {
  it("짝이 맞으면 null", () => {
    expect(checkTags('<b>a</b><blockquote><i>b</i></blockquote><a href="{링크}">c</a>')).toBeNull();
  });
  it("닫지 않은 태그와 엉뚱한 닫기", () => {
    expect(checkTags("<b>a")).toEqual({ kind: "unclosed", tag: "b" });
    expect(checkTags("<b>a</i></b>")).toEqual({ kind: "unexpected", tag: "i" });
  });
});
