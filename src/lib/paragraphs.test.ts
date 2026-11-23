import { describe, expect, it } from "vitest";
import { toBlocks } from "./paragraphs";

describe("toBlocks", () => {
  it("줄바꿈이 있으면 표식 줄과 짧은 줄은 소제목", () =>
    expect(toBlocks("저주받은 왕국의 정상에 올라라\n할로우 나이트는 모험이다.\n♦ 두 시대\n소년 링크는 자란다.")).toEqual([
      { kind: "heading", text: "저주받은 왕국의 정상에 올라라" },
      { kind: "para", text: "할로우 나이트는 모험이다." },
      { kind: "heading", text: "♦ 두 시대" },
      { kind: "para", text: "소년 링크는 자란다." },
    ]));
  it("줄바꿈 없는 옛 데이터는 표식 앞에서 가른다", () =>
    expect(toBlocks("처음 이야기다. ♦ 두 시대 소년 링크는 자란다.")).toEqual([
      { kind: "para", text: "처음 이야기다." },
      { kind: "marked", text: "♦ 두 시대 소년 링크는 자란다." },
    ]));
  it("한 덩어리는 세 문장씩 묶는다", () =>
    expect(toBlocks("하나다. 둘이다! 셋인가? 넷이다. 다섯.")).toEqual([
      { kind: "para", text: "하나다. 둘이다! 셋인가?" },
      { kind: "para", text: "넷이다. 다섯." },
    ]));
  it("띄어쓰기 없는 점은 문장 끝이 아니다", () => expect(toBlocks("v1.2 패치와 1.5배 속도.")).toEqual([{ kind: "para", text: "v1.2 패치와 1.5배 속도." }]));
  it("빈 글은 빈 배열", () => expect(toBlocks("  ")).toEqual([]));
});
