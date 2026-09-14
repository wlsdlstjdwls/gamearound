// 회사명 정규화 테스트 — 실측으로 확인한 스토어별 표기 흔들림을 그대로 케이스로 넣는다.
import { describe, expect, it } from "vitest";
import { cleanCompanyName, normalizeCompanyName, splitCompanyNames } from "./company-name";

describe("normalizeCompanyName", () => {
  it("스토어별 표기가 같은 키로 모인다", () => {
    // steam 은 "FromSoftware, Inc.", 위키데이터 라벨은 "FromSoftware" (2026-09-14 실측)
    expect(normalizeCompanyName("FromSoftware, Inc.")).toBe("fromsoftware");
    expect(normalizeCompanyName("FromSoftware")).toBe("fromsoftware");
    // xbox 는 전부 대문자로 준다
    expect(normalizeCompanyName("UBISOFT")).toBe("ubisoft");
    expect(normalizeCompanyName("Ubisoft Entertainment")).toBe("ubisoft entertainment");
  });

  it("법인 접미어를 겹쳐 붙여도 떨어진다", () => {
    expect(normalizeCompanyName("Bandai Namco Entertainment Inc.")).toBe("bandai namco entertainment");
    expect(normalizeCompanyName("Square Enix Co., Ltd.")).toBe("square enix");
    expect(normalizeCompanyName("CD PROJEKT RED S.A.")).toBe("cd projekt red");
  });

  it("접두 법인 표기를 뗀다", () => {
    expect(normalizeCompanyName("주식회사 넥슨")).toBe("넥슨");
    expect(normalizeCompanyName("株式会社カプコン")).toBe("カプコン");
    expect(normalizeCompanyName("The Behemoth")).toBe("behemoth");
  });

  it("접미어만 남는 이름은 통째로 지우지 않는다", () => {
    expect(normalizeCompanyName("Inc")).toBe("inc");
    expect(normalizeCompanyName("Co")).toBe("co");
  });

  it("상표 기호, 구두점, 중복 공백을 흡수한다", () => {
    expect(normalizeCompanyName("  Valve™   Corporation  ")).toBe("valve");
    expect(normalizeCompanyName("Naughty Dog, LLC")).toBe("naughty dog");
  });

  it("비어 있으면 빈 문자열", () => {
    expect(normalizeCompanyName("")).toBe("");
    expect(normalizeCompanyName("   ")).toBe("");
    expect(normalizeCompanyName("---")).toBe("");
  });
});

describe("cleanCompanyName", () => {
  it("대소문자는 살리고 군더더기만 턴다", () => {
    expect(cleanCompanyName("  FromSoftware,  Inc.™ ")).toBe("FromSoftware, Inc.");
  });
});

describe("splitCompanyNames", () => {
  it("한 칸에 몰아넣은 회사명을 쪼갠다", () => {
    expect(splitCompanyNames("Nintendo / HAL Laboratory")).toEqual(["Nintendo", "HAL Laboratory"]);
    expect(splitCompanyNames("Ubisoft, Massive Entertainment")).toEqual(["Ubisoft", "Massive Entertainment"]);
  });

  it("법인 표기 앞의 쉼표는 회사 구분자가 아니다", () => {
    // steam 이 엘든 링에서 실제로 주는 값. 쪼개면 "Inc." 라는 회사가 생긴다
    expect(splitCompanyNames("FromSoftware, Inc.")).toEqual(["FromSoftware, Inc."]);
    expect(splitCompanyNames("Square Enix Co., Ltd.")).toEqual(["Square Enix Co., Ltd."]);
  });

  it("구분자가 이름의 일부면 쪼개지 않는다", () => {
    // "A" 한 글자짜리 조각이 나오면 원문이 이름의 일부였다고 본다
    expect(splitCompanyNames("Tri-Ace & A")).toEqual(["Tri-Ace & A"]);
    expect(splitCompanyNames("Rockstar Games")).toEqual(["Rockstar Games"]);
  });

  it("중복은 하나로", () => {
    expect(splitCompanyNames("Sega / Sega")).toEqual(["Sega"]);
  });

  it("빈 값은 빈 배열", () => {
    expect(splitCompanyNames("  ")).toEqual([]);
  });
});
