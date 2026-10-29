import { describe, expect, it } from "vitest";
import { compareValues, matchesQuery, nextSort, pageOf, sortRows, sumOf, toTsv } from "@/lib/admin/grid";

describe("compareValues", () => {
  it("숫자, 한글(숫자 섞인 글 포함), 날짜를 맞게 비교한다", () => {
    expect(compareValues(2, 10)).toBeLessThan(0);
    expect(compareValues("상품 2", "상품 10")).toBeLessThan(0);
    expect(compareValues("가", "나")).toBeLessThan(0);
    expect(compareValues(new Date(1), new Date(2))).toBeLessThan(0);
  });
});

describe("sortRows", () => {
  const rows = [
    { n: "다", v: 3 },
    { n: "가", v: null },
    { n: "나", v: 1 },
  ];
  const val = (r: (typeof rows)[number], k: string) => (k === "v" ? r.v : r.n);
  it("오름, 내림 모두 빈 값은 뒤", () => {
    expect(sortRows(rows, { key: "v", dir: "asc" }, val).map((r) => r.n)).toEqual(["나", "다", "가"]);
    expect(sortRows(rows, { key: "v", dir: "desc" }, val).map((r) => r.n)).toEqual(["다", "나", "가"]);
  });
  it("정렬 없음이면 처음 순서", () => {
    expect(sortRows(rows, null, val)).toEqual(rows);
  });
});

describe("nextSort", () => {
  it("오름 → 내림 → 없음, 다른 칸이면 오름부터", () => {
    expect(nextSort(null, "a")).toEqual({ key: "a", dir: "asc" });
    expect(nextSort({ key: "a", dir: "asc" }, "a")).toEqual({ key: "a", dir: "desc" });
    expect(nextSort({ key: "a", dir: "desc" }, "a")).toBeNull();
    expect(nextSort({ key: "a", dir: "desc" }, "b")).toEqual({ key: "b", dir: "asc" });
  });
});

describe("matchesQuery, pageOf, sumOf, toTsv", () => {
  it("띄어쓰기, 대소문자 없이 찾는다", () => {
    expect(matchesQuery(["인디 게임 부스트"], "게임부스트")).toBe(true);
    expect(matchesQuery(["Steam"], "steam")).toBe(true);
    expect(matchesQuery(["Steam"], "xbox")).toBe(false);
  });
  it("쪽 범위를 넘으면 끝 쪽", () => {
    const r = pageOf([1, 2, 3, 4, 5], 9, 2);
    expect(r).toEqual({ rows: [5], page: 3, pages: 3 });
    expect(pageOf([], 1, 10).pages).toBe(1);
  });
  it("숫자만 더한다", () => {
    expect(sumOf([1, null, 2, "x"], (v) => v as number | null)).toBe(3);
  });
  it("탭, 줄바꿈은 칸 안에서 지운다", () => {
    expect(toTsv(["a", "b"], [["1\t2", "x\ny"]])).toBe("a\tb\n1 2\tx y");
  });
});
