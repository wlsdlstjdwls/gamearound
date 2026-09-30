import { describe, expect, it } from "vitest";
import { syncFieldLabels } from "./sync-fields";

describe("syncFieldLabels", () => {
  it("가격 세 칸은 한 묶음으로, 표 순서대로", () => {
    expect(syncFieldLabels(["coverUrl", "currentPrice", "listPrice", "discountPct"])).toEqual(["가격", "할인", "이미지"]);
  });
  it("표에 없는 키는 맨 뒤 기타 하나로", () => {
    expect(syncFieldLabels(["somethingNew", "anotherNew", "releaseDate"])).toEqual(["출시일", "기타"]);
  });
  it("모르는 변경 표식과 모르는 키가 겹쳐도 기타는 하나", () => {
    expect(syncFieldLabels(["other", "somethingNew"])).toEqual(["기타"]);
  });
  it("빈 목록은 빈 목록", () => {
    expect(syncFieldLabels([])).toEqual([]);
  });
});
