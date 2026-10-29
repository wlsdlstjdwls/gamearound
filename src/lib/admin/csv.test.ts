import { describe, expect, it } from "vitest";
import { csvCell, csvFileName, toCsv } from "@/lib/admin/csv";

describe("csvCell", () => {
  it("쉼표, 따옴표, 줄바꿈이 있으면 따옴표로 감싼다", () => {
    expect(csvCell("가,나")).toBe('"가,나"');
    expect(csvCell('말 "그대로"')).toBe('"말 ""그대로"""');
    expect(csvCell("줄\n바꿈")).toBe('"줄\n바꿈"');
    expect(csvCell("6,900원")).toBe('"6,900원"');
  });
  it("수식으로 읽힐 값은 글자로 묶는다", () => {
    expect(csvCell("=HYPERLINK(1)")).toBe("'=HYPERLINK(1)");
    expect(csvCell("-1")).toBe("'-1");
    expect(csvCell("평범한 제목")).toBe("평범한 제목");
  });
});

describe("toCsv", () => {
  it("BOM 을 붙이고 CRLF 로 잇는다", () => {
    expect(toCsv(["상품", "값"], [["스파크", "6,900원"]])).toBe('﻿상품,값\r\n스파크,"6,900원"');
  });
});

describe("csvFileName", () => {
  it("화면 이름 + 한국 날짜 시각, 못 쓰는 글자는 뺀다", () => {
    expect(csvFileName("결제/환불관리", new Date("2026-10-29T14:10:00Z"))).toBe("결제환불관리_20261029-2310.csv");
  });
});
