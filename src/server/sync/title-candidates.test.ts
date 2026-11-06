// 흡수 후보 좁히기의 열쇠 — DB 를 안 타는 부분만 본다
import { describe, expect, it } from "vitest";
import { titleKeys } from "./title-candidates";

describe("titleKeys", () => {
  it("에디션 꼬리를 뗀 열쇠와 통째 정규화 둘 다 낸다 — DB 제목이 꼬리를 달고 있어도 앞부분 일치로 잡힌다", () => {
    const keys = titleKeys(["Flintlock Deluxe Edition"]);
    expect(keys).toContain("flintlock");
    expect(keys).toContain("flintlockdeluxeedition");
  });
  it("같은 열쇠는 한 번만, 빈 제목은 버린다", () => {
    expect(titleKeys(["Braid", "BRAID", "™"])).toEqual(["braid"]);
  });
});
