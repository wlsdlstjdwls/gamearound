import { describe, expect, it } from "vitest";
import { pageWindow, readPageParam } from "@/lib/pagination";

describe("readPageParam", () => {
  it("빈 값, 숫자 아님, 1 미만은 1 쪽", () => {
    expect(readPageParam(undefined)).toBe(1);
    expect(readPageParam("")).toBe(1);
    expect(readPageParam("abc")).toBe(1);
    expect(readPageParam("0")).toBe(1);
    expect(readPageParam("-3")).toBe(1);
  });
  it("소수는 내리고 배열은 첫 값", () => {
    expect(readPageParam("2.7")).toBe(2);
    expect(readPageParam(["3", "5"])).toBe(3);
  });
});

describe("pageWindow", () => {
  it("한 쪽뿐이면 [1]", () => {
    expect(pageWindow(1, 1)).toEqual([1]);
  });
  it("양 끝은 남기고 멀리 떨어진 곳은 생략", () => {
    expect(pageWindow(10, 20)).toEqual([1, null, 8, 9, 10, 11, 12, null, 20]);
  });
});
