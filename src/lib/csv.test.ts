// CSV 파서 테스트 — 순수 함수만(AGENTS §8).
import { describe, expect, it } from "vitest";
import { csvCell, parseCsv, toCsv } from "./csv";

describe("parseCsv", () => {
  it("쉼표와 줄바꿈으로 가른다", () => {
    expect(parseCsv("a,b\n1,2")).toEqual([["a", "b"], ["1", "2"]]);
  });

  it("CRLF 와 끝 줄바꿈을 한 줄로 센다", () => {
    expect(parseCsv("a,b\r\n1,2\r\n")).toEqual([["a", "b"], ["1", "2"]]);
  });

  it("따옴표 안 쉼표, 줄바꿈, 이스케이프를 지킨다", () => {
    expect(parseCsv('"젤다, 왕국","말 ""한"" 줄\n둘"')).toEqual([["젤다, 왕국", '말 "한" 줄\n둘']]);
  });

  it("BOM 을 뗀다", () => {
    expect(parseCsv("\uFEFF상품명\nx")[0][0]).toBe("상품명");
  });

  it("빈 칸만 있는 줄은 버린다", () => {
    expect(parseCsv("a,b\n,,\n1,2\n")).toEqual([["a", "b"], ["1", "2"]]);
  });

  it("빈 칸은 빈 문자열로 남긴다", () => {
    expect(parseCsv("a,,c")).toEqual([["a", "", "c"]]);
  });
});

describe("toCsv", () => {
  it("필요할 때만 감싼다", () => {
    expect(csvCell("plain")).toBe("plain");
    expect(csvCell("a,b")).toBe('"a,b"');
    expect(csvCell('a"b')).toBe('"a""b"');
  });

  it("쓴 것을 다시 읽으면 같다", () => {
    const rows = [["이름", "값"], ["젤다, 왕국", '따옴표 "하나"']];
    expect(parseCsv(toCsv(rows))).toEqual(rows);
  });
});
