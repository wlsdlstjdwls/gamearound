import { describe, expect, it } from "vitest";
import { unzipSync, strFromU8 } from "fflate";
import { buildXlsx, colName, columnWidths, displayWidth, sheetXml, xlsxFileName } from "@/lib/admin/xlsx";

describe("colName", () => {
  it("엑셀 칸 이름", () => {
    expect([0, 25, 26, 51, 52].map(colName)).toEqual(["A", "Z", "AA", "AZ", "BA"]);
  });
});

describe("displayWidth, columnWidths", () => {
  it("한글은 두 칸, 너비는 위아래 한계 안에서", () => {
    expect(displayWidth("abc")).toBe(3);
    expect(displayWidth("상품명")).toBe(6);
    expect(columnWidths(["No", "상품명"], [[1, "가".repeat(80)]])).toEqual([6, 60]);
  });
});

describe("sheetXml", () => {
  const xml = sheetXml({ title: "상품등록", meta: "26. 10. 30. 16:10 내려받음 | 2건", head: ["상품명", "판매가"], rows: [["=SUM(1)", 6900], ["유사도 & <b>", 0.87]] });
  it("글은 inlineStr 로 넣어 수식으로 읽히지 않고, XML 글자는 이스케이프한다", () => {
    expect(xml).toContain('t="inlineStr"><is><t xml:space="preserve">=SUM(1)</t>');
    expect(xml).not.toContain("<f>");
    expect(xml).toContain("유사도 &amp; &lt;b&gt;");
  });
  it("정수와 소수는 숫자 칸으로 서식을 가른다", () => {
    expect(xml).toContain('<c r="B5" s="5"><v>6900</v></c>');
    expect(xml).toContain('<c r="B6" s="6"><v>0.87</v></c>');
  });
  it("머리 줄에 틀 고정, 필터는 걸지 않는다", () => {
    expect(xml).toContain('ySplit="4"');
    expect(xml).not.toContain("autoFilter");
  });
});

describe("buildXlsx", () => {
  it("필요한 부품을 모두 묶는다", () => {
    const files = unzipSync(buildXlsx({ title: "결제/환불관리", meta: "", head: ["a"], rows: [["x"]] }));
    expect(Object.keys(files).sort()).toEqual(["[Content_Types].xml", "_rels/.rels", "xl/_rels/workbook.xml.rels", "xl/styles.xml", "xl/workbook.xml", "xl/worksheets/sheet1.xml"]);
    // 시트 이름에 못 쓰는 글자(/)는 뺀다
    expect(strFromU8(files["xl/workbook.xml"])).toContain('name="결제환불관리"');
  });
});

describe("xlsxFileName", () => {
  const now = new Date("2026-10-30T07:10:00Z");
  it("프로그램명_코드_명_날짜, 못 쓰는 글자와 빈칸은 걷는다", () => {
    expect(xlsxFileName({ program: "프로모션등록", code: "maker-first-month", name: "첫 달 할인" }, now)).toBe("프로모션등록_maker-first-month_첫달할인_20261030.xlsx");
  });
  it("고른 줄이 없으면 프로그램명_날짜", () => {
    expect(xlsxFileName({ program: "결제/환불관리" }, now)).toBe("결제환불관리_20261030.xlsx");
  });
});
