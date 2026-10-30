import { describe, expect, it } from "vitest";
import { jamoStages } from "./hangul-typing";

describe("jamoStages", () => {
  it("받침 없는 글자는 초성, 완성 두 장면", () => expect(jamoStages("가")).toEqual(["ㄱ", "가"]));
  it("받침 있는 글자는 세 장면", () => expect(jamoStages("할")).toEqual(["ㅎ", "하", "할"]));
  it("된소리 초성도 그대로", () => expect(jamoStages("쌀")).toEqual(["ㅆ", "싸", "쌀"]));
  it("한글이 아니면 한 장면", () => {
    expect(jamoStages("?")).toEqual(["?"]);
    expect(jamoStages("A")).toEqual(["A"]);
    expect(jamoStages(" ")).toEqual([" "]);
  });
});
