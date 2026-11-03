// 이름만으로 세우는 회사의 slug 정하기 — 순수 함수만
import { describe, expect, it } from "vitest";
import { planNameOnlySlugs } from "./company-name-only";

describe("planNameOnlySlugs", () => {
  it("이미 쓰는 slug 와 묶음 안의 겹침을 숫자 꼬리로 피한다", () => {
    expect(planNameOnlySlugs(["Red Fables", "Ocean Media", "Ocean-Media"], new Set(["red-fables"]))).toEqual(["red-fables-2", "ocean-media", "ocean-media-2"]);
  });
});
