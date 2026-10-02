import { describe, expect, it } from "vitest";
import { decodeHtmlEntities } from "./html-entities";

describe("decodeHtmlEntities", () => {
  it("숫자, 16진수, 이름 엔티티를 푼다", () => {
    expect(decodeHtmlEntities("&#039;셀린&#039; 열린다")).toBe("'셀린' 열린다");
    expect(decodeHtmlEntities("&quot;주 5일&quot;")).toBe('"주 5일"');
    expect(decodeHtmlEntities("Tom &amp; Jerry &#x27;x&#x27;")).toBe("Tom & Jerry 'x'");
  });

  it("두 겹 인코딩도 벗긴다(게임메카 실측)", () => {
    expect(decodeHtmlEntities("&amp;#039;럽플레이스&amp;#039;")).toBe("'럽플레이스'");
  });

  it("모르는 이름과 제어 문자는 그대로 둔다", () => {
    expect(decodeHtmlEntities("&foo; &#1;")).toBe("&foo; &#1;");
  });

  it("엔티티가 없으면 같은 글자를 돌려준다", () => {
    expect(decodeHtmlEntities("Cyberpunk 2077")).toBe("Cyberpunk 2077");
  });
});
