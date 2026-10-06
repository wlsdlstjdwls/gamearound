import { describe, expect, it } from "vitest";
import { psstoreStandardProductId } from "./standard-product";

const p = (id: string, name: string) => ({ id, name });

describe("psstoreStandardProductId", () => {
  it("기본 상품이 에디션이면 같은 제목의 일반판을 찾는다 (GTA VI)", () => {
    const def = p("ULT", "Grand Theft Auto VI: 얼티밋 에디션 (한국어판)");
    expect(psstoreStandardProductId(def, [def, p("STD", "Grand Theft Auto VI (한국어판)")])).toBe("STD");
  });

  it("기본 상품이 이미 일반판이면 null", () => {
    const def = p("STD", "코만도스: 오리진 (중국어(간체자), 한국어, 영어)");
    expect(psstoreStandardProductId(def, [def, p("DLX", "코만도스: 오리진 - 디럭스 에디션 (중국어(간체자), 한국어, 영어)")])).toBeNull();
  });

  it("체험판, 프롤로그, 다른 게임은 일반판이 아니다", () => {
    const def = p("DLX", "Alone in the Dark - Digital Deluxe Edition (영어)");
    expect(psstoreStandardProductId(def, [def, p("PRO", "Alone in the Dark Prologue (영어)")])).toBeNull();
    const aa = p("AA2", "Arcade Archives 2 CYBER COMMANDO (영어, 일본어)");
    expect(psstoreStandardProductId(aa, [aa, p("AA1", "Arcade Archives CYBER COMMANDO (영어, 일본어)")])).toBeNull();
  });

  it("에디션끼리는 고르지 않는다", () => {
    const def = p("DLX", "Foo: Digital Deluxe Edition (영어)");
    expect(psstoreStandardProductId(def, [def, p("GOLD", "Foo: Gold Edition (영어)")])).toBeNull();
  });

  it("같은 이름 둘은 null", () => {
    const def = p("A", "Backyard Baseball '97 (영어)");
    expect(psstoreStandardProductId(def, [def, p("B", "Backyard Baseball '97 (영어)")])).toBeNull();
  });
});
