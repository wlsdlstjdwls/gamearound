import { describe, expect, it } from "vitest";
import { parsePatchBody, previewBlocks } from "./body-blocks";

describe("parsePatchBody", () => {
  it("제목, 목록, 문단으로 가른다", () => {
    expect(parsePatchBody("## 수정\n\n- 하나\n- 둘\n\n첫 줄\n둘째 줄")).toEqual([
      { kind: "heading", text: "수정" },
      { kind: "list", items: ["하나", "둘"] },
      { kind: "para", lines: ["첫 줄", "둘째 줄"] },
    ]);
  });

  it("빈 줄 없이 붙은 목록과 문단도 가른다", () => {
    expect(parsePatchBody("소개\n- 항목")).toEqual([
      { kind: "para", lines: ["소개"] },
      { kind: "list", items: ["항목"] },
    ]);
  });

  it("스팀 항목 닫는 표시 [/*] 는 걷고 목록을 잇는다", () => {
    expect(parsePatchBody("- 가\n\n[/*]\n- 나\n\n[/*]")).toEqual([{ kind: "list", items: ["가", "나"] }]);
  });
  it("빈 글은 빈 배열", () => {
    expect(parsePatchBody("\n\n")).toEqual([]);
  });
});

describe("previewBlocks", () => {
  const blocks = parsePatchBody("## 제목\n\n- 가나다\n- 라마바\n- 사아자\n\n끝 문단");

  it("글자 합이 한도 안이면 다 보이고 자르지 않는다", () => {
    expect(previewBlocks(blocks, 1000)).toEqual({ shown: blocks, truncated: false });
  });

  it("목록은 항목 단위로 자른다", () => {
    const { shown, truncated } = previewBlocks(blocks, 8);
    expect(truncated).toBe(true);
    expect(shown).toEqual([
      { kind: "heading", text: "제목" },
      { kind: "list", items: ["가나다", "라마바"] },
    ]);
  });

  it("첫 덩어리는 길어도 담는다", () => {
    const { shown, truncated } = previewBlocks(parsePatchBody("아주 긴 첫 문단\n\n둘째"), 2);
    expect(shown).toHaveLength(1);
    expect(truncated).toBe(true);
  });
});
