import { describe, expect, it } from "vitest";
import { englishFromHongKongName, englishFromParens, englishFromSplit, englishLeadingRun, isUsableEnglishTitle, pickEnglishTitle } from "./nintendo-en-title";

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
  it("홍콩판 한자 바깥, 영문 괄호", () => {
    expect(englishFromParens("時尚造夢（Fashion Dreamer）")).toBe("Fashion Dreamer");
  });
});

describe("englishFromSplit", () => {
  it("파이프, 빗금, 띄어쓴 하이픈", () => {
    expect(englishFromSplit("극장 불안 | Theater Unrest")).toBe("Theater Unrest");
    expect(englishFromSplit("Alchemist Adventure/알케미스트 어드벤처")).toBe("Alchemist Adventure");
    expect(englishFromSplit("Maneater - 맨이터")).toBe("Maneater");
  });
  it("붙여 쓴 하이픈은 가르지 않는다", () => {
    expect(englishFromSplit("Spider-Man 스파이더맨")).toBeNull();
  });
  it("띄어쓴 하이픈은 영문이 앞일 때만", () => {
    expect(englishFromSplit("용의 별 바르니르 - Ecdysis of the dragon")).toBeNull();
    expect(englishFromSplit("버거체인 스토리 (Burger Bistro Story) – Nintendo Switch 2 Edition")).toBeNull();
  });
  it("겹낫표 반쪽이 남으면 null", () => {
    expect(englishFromSplit("《보우:월하의 청연 / Bō: Path of the Teal Lotus》DIGITAL DELUXE EDITION")).toBeNull();
  });
  it("세 쪽 이상이면 null", () => {
    expect(englishFromSplit("가 / Foo Bar / 나")).toBeNull();
  });
});

describe("englishFromHongKongName", () => {
  it("영문 괄호는 받고 판매 꼬리표는 버린다", () => {
    expect(englishFromHongKongName("時尚造夢（Fashion Dreamer）")).toBe("Fashion Dreamer");
    expect(englishFromHongKongName("貓咪大戰爭（Retail Only）")).toBeNull();
  });
});

describe("englishLeadingRun", () => {
  it("한글 앞 영문", () => {
    expect(englishLeadingRun("Nexomon: Extinction 넥소몬: 멸종")).toBe("Nexomon: Extinction");
    expect(englishLeadingRun("Riviera ~약속의 땅 리비에라~")).toBe("Riviera");
    expect(englishLeadingRun("SCANDAL〜결혼까지 생각했어〜")).toBe("SCANDAL");
  });
  it("한글 뒤 영문은 받지 않는다", () => {
    expect(englishLeadingRun("데스 엔드 리퀘스트 Code Z")).toBeNull();
    expect(englishLeadingRun("버디 미션 BOND")).toBeNull();
  });
  it("한글 뒤에 영문이 다시 이어지면 받지 않는다", () => {
    expect(englishLeadingRun("Naruto -나루토- 질풍전 나루티밋 스톰 4 Road To Boruto")).toBeNull();
  });
  it("한자가 섞인 앞부분은 받지 않는다", () => {
    expect(englishLeadingRun("闇の仕事人Kage　Shadow Of The Ninja　어둠의 해결사")).toBeNull();
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
  it("괄호가 없으면 구분자, 그다음 앞쪽 영문", () => {
    expect(pickEnglishTitle("이스케이프 더 백룸 | Escape the Backrooms", null)).toBe("Escape the Backrooms");
    expect(pickEnglishTitle("Give It Up! Bouncy 포기하지마! 바운시", null)).toBe("Give It Up! Bouncy");
  });
  it("쓸 것이 없으면 null", () => {
    expect(pickEnglishTitle("고양이의 우주 아틀라스", null)).toBeNull();
  });
  it("상표 기호는 걷는다", () => {
    expect(pickEnglishTitle("포켓몬", "Pokémon™ Legends")).toBe("Pokémon Legends");
  });
});
