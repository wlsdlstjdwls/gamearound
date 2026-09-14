// 회사 이름 추출 테스트 — 순수 함수만. DB 는 건드리지 않는다.
import { describe, expect, it } from "vitest";
import { companyNamesOf } from "./company-writer";

describe("companyNamesOf", () => {
  it("개발사와 배급사를 역할과 함께 돌려준다", () => {
    expect(companyNamesOf("FromSoftware, Inc.", "Bandai Namco Entertainment")).toEqual([
      { name: "FromSoftware, Inc.", role: "developer" },
      { name: "Bandai Namco Entertainment", role: "publisher" },
    ]);
  });

  it("같은 회사가 개발과 배급을 겸하면 행이 두 개다", () => {
    // 엘든 링의 steam 응답이 실제로 이렇다(2026-09-14 실측)
    expect(companyNamesOf("FromSoftware, Inc.", "FromSoftware, Inc.")).toEqual([
      { name: "FromSoftware, Inc.", role: "developer" },
      { name: "FromSoftware, Inc.", role: "publisher" },
    ]);
  });

  it("한 칸에 몰아넣은 이름을 쪼갠다", () => {
    expect(companyNamesOf("Nintendo / HAL Laboratory", null)).toEqual([
      { name: "Nintendo", role: "developer" },
      { name: "HAL Laboratory", role: "developer" },
    ]);
  });

  it("같은 역할에서 표기만 다른 같은 회사는 한 번만", () => {
    expect(companyNamesOf("Ubisoft / UBISOFT", null)).toEqual([{ name: "Ubisoft", role: "developer" }]);
  });

  it("정규화하면 빈 문자열이 되는 이름은 버린다", () => {
    expect(companyNamesOf("---", null)).toEqual([]);
  });

  it("둘 다 없으면 빈 배열", () => {
    expect(companyNamesOf(null, null)).toEqual([]);
  });
});
