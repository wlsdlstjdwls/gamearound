// 판매 목록 CSV 읽기 테스트 — 순수 함수만(AGENTS §8).
import { describe, expect, it } from "vitest";
import { toCsv } from "@/lib/csv";
import { LISTING_CSV_HEADER, readListingCsv } from "./listing-csv";
import { CSV_MESSAGES, LISTING_MESSAGES } from "./listing-messages";

const HW = [
  { code: "switch", nameKo: "닌텐도 스위치" },
  { code: "ps5", nameKo: "플레이스테이션 5" },
];

function read(rows: string[][]) {
  return readListingCsv(toCsv(rows), HW);
}

describe("readListingCsv", () => {
  it("양식 그대로면 값이 스키마 꼴로 옮겨진다", () => {
    const r = read([LISTING_CSV_HEADER, ["젤다의 전설", "4902370 550733", "닌텐도 스위치", "새 제품", "54,000원", "3", "판매 중"]]);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.rows[0]).toEqual({
      line: 2,
      ok: true,
      value: {
        name: "젤다의 전설",
        barcode: "4902370550733",
        hardwareCode: "switch",
        condition: "new",
        priceMinor: 54000,
        onHand: 3,
        status: "selling",
      },
    });
  });

  it("영어 머리글, 다른 열 순서, 기종 코드도 받는다", () => {
    const r = read([["qty", "price", "name", "hardware"], ["1", "1000", "굿즈", "PS5"]]);
    expect(r.ok && r.rows[0].ok && r.rows[0].value).toMatchObject({ onHand: 1, priceMinor: 1000, hardwareCode: "ps5", condition: "used", status: "selling" });
  });

  it("필수 열이 없으면 줄을 읽지 않는다", () => {
    const r = read([["상품명", "판매가"], ["a", "1"]]);
    expect(r).toEqual({ ok: false, error: CSV_MESSAGES.headerMissing("수량") });
  });

  it("머리글만 있으면 빈 파일이다", () => {
    expect(read([LISTING_CSV_HEADER])).toEqual({ ok: false, error: CSV_MESSAGES.empty });
  });

  it("틀린 줄은 줄 번호와 함께 따로 실패한다", () => {
    const r = read([
      ["상품명", "판매가", "수량", "기종", "상태"],
      ["정상", "1000", "1", "", ""],
      ["수량 빈 줄", "1000", "", "", ""],
      ["모르는 기종", "1000", "1", "게임보이 울트라", ""],
      ["틀린 상태", "1000", "1", "", "반쯤 새것"],
      ["음수 값", "-5", "1", "", ""],
    ]);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.rows.map((x) => (x.ok ? "ok" : x.error))).toEqual([
      "ok",
      CSV_MESSAGES.valueRequired("수량"),
      CSV_MESSAGES.hardwareUnknown("게임보이 울트라"),
      CSV_MESSAGES.conditionUnknown("반쯤 새것"),
      LISTING_MESSAGES.priceInvalid,
    ]);
    expect(r.rows.map((x) => x.line)).toEqual([2, 3, 4, 5, 6]);
  });

  it("바코드 자릿수는 손입력과 같은 규칙으로 막는다", () => {
    const r = read([["상품명", "바코드", "판매가", "수량"], ["a", "123", "1", "1"]]);
    expect(r.ok && !r.rows[0].ok && r.rows[0].error).toBe(LISTING_MESSAGES.barcodeInvalid);
  });
});
