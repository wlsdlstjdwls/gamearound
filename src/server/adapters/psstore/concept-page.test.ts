// 콘셉트 페이지 파서 — 2026-11-16 러너에서 받은 진짜 페이지에서 잘라 낸 견본
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { parsePsstoreConceptPage } from "./concept-page";

const fixture = (name: string): string => readFileSync(fileURLToPath(new URL(`../__fixtures__/${name}`, import.meta.url)), "utf8");

describe("parsePsstoreConceptPage", () => {
  it("상품 하나가 PS4, PS5 를 함께 덮는 콘셉트(I.Q, 이름에 기기 표기 없음)", () => {
    const page = parsePsstoreConceptPage(fixture("psstore-concept-page-crossgen.html"));
    expect(page.publisher).toBe("Sony Interactive Entertainment");
    expect(page.platformsByProduct["EP9000-PPSA06356_00-SCES008660000000"]).toEqual(["ps4", "ps5"]);
  });

  it("PS4 상품이 따로 있는 콘셉트(Splitgate 2)는 상품마다 기기가 갈린다", () => {
    const page = parsePsstoreConceptPage(fixture("psstore-concept-page-split.html"));
    expect(page.publisher).toBe("1047 Games, Inc.");
    expect(page.platformsByProduct["UP5988-PPSA20608_00-SPLITGATE2PS5000"]).toEqual(["ps5"]);
    expect(page.platformsByProduct["UP5988-CUSA46892_00-SPLITGATE2PS4000"]).toEqual(["ps4"]);
  });

  it("칸이 없으면 빈 값, 이스케이프된 유통사 이름을 푼다, 우리 기기가 아닌 것은 버린다", () => {
    expect(parsePsstoreConceptPage("<html></html>")).toEqual({ publisher: null, platformsByProduct: {} });
    const html = `"Product:X":{"id":"X","__typename":"Product","platforms":["PS5","PSPC"]},"publisherName":"A \\"B\\" Games"`;
    expect(parsePsstoreConceptPage(html)).toEqual({ publisher: 'A "B" Games', platformsByProduct: { X: ["ps5"] } });
  });
});
