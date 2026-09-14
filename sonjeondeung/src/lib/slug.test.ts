import { describe, expect, it } from "vitest";
import { normalizeForSearch } from "./slug";

// 이 규칙은 games.title_en_norm / title_ko_norm 생성 컬럼과 짝을 이룬다.
// SQL: lower(regexp_replace(title, '[^[:alnum:]]+', '', 'g')) — C.UTF-8 기준
describe("normalizeForSearch", () => {
  it.each([
    ["ELDEN RING", "eldenring"],
    ["엘든 링", "엘든링"],
    ["엘든링", "엘든링"],
    ["철권 8", "철권8"],
    ["철권8", "철권8"],
    ["Diablo® IV", "diabloiv"],
    ["Diablo™ IV", "diabloiv"],
    ["Sid Meier's Civilization® VI", "sidmeierscivilizationvi"],
    ["Warhammer 40,000: Space Marine 2", "warhammer40000spacemarine2"],
    ["  공백   투성이  ", "공백투성이"],
    ["ダークソウル", "ダークソウル"],
    ["三國志", "三國志"],
  ])("%s → %s", (input, expected) => {
    expect(normalizeForSearch(input)).toBe(expected);
  });

  it("공백·구두점만 다른 제목은 같은 키가 된다", () => {
    expect(normalizeForSearch("엘든 링")).toBe(normalizeForSearch("엘든링"));
    expect(normalizeForSearch("ELDEN RING:")).toBe(normalizeForSearch("eldenring"));
  });

  it("구두점뿐인 질의는 빈 문자열 — 호출부가 전체 매치를 피하도록", () => {
    expect(normalizeForSearch("!!! ???")).toBe("");
  });
});
