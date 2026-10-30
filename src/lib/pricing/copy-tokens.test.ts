import { describe, expect, it } from "vitest";
import { displayToken, fromDisplayCopy, toDisplayCopy } from "@/lib/pricing/copy-tokens";

describe("copy tokens", () => {
  it("저장 꼴과 화면 꼴을 오간다", () => {
    const stored = "둘 다 걸면 {saving} 싸요, 이용권 {credits}장, {price}부터";
    const shown = toDisplayCopy(stored);
    expect(shown).toBe("둘 다 걸면 {절약금액} 싸요, 이용권 {이용권수}장, {낱개값}부터");
    expect(fromDisplayCopy(shown)).toBe(stored);
  });
  it("옛 화면 꼴 [절약 금액] 도 읽는다", () => {
    expect(fromDisplayCopy("[절약 금액] 싸요")).toBe("{saving} 싸요");
  });
  it("모르는 자리표시와 보통 대괄호는 건드리지 않는다", () => {
    expect(toDisplayCopy("{unknown} [메모]")).toBe("{unknown} [메모]");
    expect(fromDisplayCopy("[메모]")).toBe("[메모]");
  });
  it("넣을 꼴", () => {
    expect(displayToken("saving")).toBe("{절약금액}");
  });
});
