import { describe, expect, it } from "vitest";
import { englishFromParens, isUsableEnglishTitle, pickEnglishTitle } from "./nintendo-en-title";

describe("isUsableEnglishTitle", () => {
  it("라틴 글자 셋 이상, 한글과 가나, 한자 없음", () => {
    expect(isUsableEnglishTitle("Tale of Immortal")).toBe(true);
    expect(isUsableEnglishTitle("VR")).toBe(false);
    expect(isUsableEnglishTitle("귀곡팔황")).toBe(false);
    expect(isUsableEnglishTitle("ゼルダの伝説")).toBe(false);
    expect(isUsableEnglishTitle(null)).toBe(false);
  });
});

describe("englishFromParens", () => {
  it("한글 바깥, 영문 괄호", () => {
    expect(englishFromParens("버서크 보이 (Berserk Boy)")).toBe("Berserk Boy");
  });
  it("영문 바깥, 한글 괄호", () => {
    expect(englishFromParens("High Sea Saga DX(대해적 스토리DX)")).toBe("High Sea Saga DX");
  });
  it("괄호 꼴이 아니면 null", () => {
    expect(englishFromParens("고양이의 우주 아틀라스")).toBeNull();
  });
  it("양쪽 다 한글이면 null", () => {
    expect(englishFromParens("젤다의 전설 (한국어판)")).toBeNull();
  });
});

describe("pickEnglishTitle", () => {
  it("타이틀 DB 이름이 먼저다", () => {
    expect(pickEnglishTitle("귀곡팔황", "Tale of Immortal")).toBe("Tale of Immortal");
  });
  it("타이틀 DB 에 없으면 괄호 안 영문", () => {
    expect(pickEnglishTitle("아귀 (Anglerfish)", null)).toBe("Anglerfish");
  });
  it("타이틀 DB 이름에도 한글이 있으면 괄호로 넘어간다", () => {
    expect(pickEnglishTitle("아귀 (Anglerfish)", "아귀")).toBe("Anglerfish");
  });
  it("이미 영문이면 손대지 않는다", () => {
    expect(pickEnglishTitle("Berserk Boy", "Berserk Boy")).toBeNull();
  });
  it("쓸 것이 없으면 null", () => {
    expect(pickEnglishTitle("고양이의 우주 아틀라스", null)).toBeNull();
  });
  it("상표 기호는 걷는다", () => {
    expect(pickEnglishTitle("포켓몬", "Pokémon™ Legends")).toBe("Pokémon Legends");
  });
});
