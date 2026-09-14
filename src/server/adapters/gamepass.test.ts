// Game Pass 파서 테스트 — fixture 기반(sigls/v2 실응답, market=KR), 네트워크 없음
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { parseSiglProductIds } from "./gamepass";

const fixture = (name: string): unknown =>
  JSON.parse(readFileSync(fileURLToPath(new URL(`./__fixtures__/${name}`, import.meta.url)), "utf8"));

describe("parseSiglProductIds", () => {
  it("컬렉션 헤더를 건너뛰고 제품 ID 만 뽑는다", () => {
    const ids = parseSiglProductIds(fixture("gamepass-sigls.json"));
    expect(ids).toContain("9NLHVWSFB0FC");
    expect(ids).toContain("C0N22P73QZ60");
    // 첫 원소(siglId 만 있는 헤더)는 제품이 아니다
    expect(ids).not.toContain("f6f1f99f-9b49-4ccd-b3bf-4d9767a77f5e");
  });

  it("같은 ID 가 두 번 와도 한 번만 센다", () => {
    const ids = parseSiglProductIds(fixture("gamepass-sigls.json"));
    expect(ids.filter((id) => id === "9NPDN9R45JX4")).toHaveLength(1);
  });

  it("제품 ID 형태가 아니면 버린다", () => {
    expect(parseSiglProductIds([{ id: "소문자아님" }, { id: "9NLHVWSFB0FC" }, { id: 123 }, null])).toEqual(["9NLHVWSFB0FC"]);
  });

  it("배열이 아니면 빈 목록", () => {
    expect(parseSiglProductIds({ error: "nope" })).toEqual([]);
    expect(parseSiglProductIds(null)).toEqual([]);
  });
});
