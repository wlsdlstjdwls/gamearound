import { describe, expect, it } from "vitest";
import { retailerLinks } from "./retailers";

describe("retailerLinks", () => {
  it("괄호 안 쇼핑몰까지 찾는다", () => {
    const text = "전국 오프라인 게임전문점(일부 점포 제외), 온라인 닌텐도 브랜드관(G마켓, 옥션, 11번가), 롯데홈쇼핑, 예스이십사 등 주요 쇼핑몰";
    expect(retailerLinks(text).map((r) => r.name)).toEqual(["G마켓", "옥션", "11번가", "롯데홈쇼핑", "예스24"]);
  });
  it("띄어쓰기가 달라도 같은 곳", () => {
    expect(retailerLinks("토이저러스 몰").map((r) => r.name)).toEqual(["토이저러스"]);
    expect(retailerLinks("토이저러스몰").map((r) => r.name)).toEqual(["토이저러스"]);
  });
  it("모르는 곳뿐이면 빈 배열", () => {
    expect(retailerLinks("이마트 APP(디지털그랩)")).toEqual([]);
    expect(retailerLinks(null)).toEqual([]);
  });
});
