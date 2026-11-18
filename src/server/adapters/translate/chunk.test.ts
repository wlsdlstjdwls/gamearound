import { describe, expect, it } from "vitest";
import { chunkForTranslation, joinChunks } from "./chunk";

const rejoin = (text: string, max: number) => {
  const chunks = chunkForTranslation(text, max);
  return { chunks, back: joinChunks(chunks, chunks.map((c) => c.text)) };
};

describe("chunkForTranslation", () => {
  it("한도 안이면 한 조각이다", () => {
    expect(chunkForTranslation("short", 100)).toEqual([{ joiner: "", text: "short" }]);
  });

  it("빈 글은 빈 배열이다", () => {
    expect(chunkForTranslation("", 100)).toEqual([]);
  });

  it("문단 경계에서 자르고 문단을 모아 한도까지 채운다", () => {
    const text = ["aaaa", "bbbb", "cccc"].join("\n\n");
    const { chunks, back } = rejoin(text, 10);
    expect(chunks.map((c) => c.text)).toEqual(["aaaa\n\nbbbb", "cccc"]);
    expect(chunks[1].joiner).toBe("\n\n");
    expect(back).toBe(text);
  });

  it("문단 하나가 크면 줄, 문장 순으로 내려가고 되붙이면 원문이다", () => {
    const text = "## Head\n\n- one item here\n- two item here\n\nFirst sentence here. Second sentence here. Third.";
    const { chunks, back } = rejoin(text, 22);
    expect(chunks.every((c) => c.text.length <= 22)).toBe(true);
    expect(back).toBe(text);
  });

  it("경계가 없는 긴 글은 글자 수로 자른다", () => {
    const text = "x".repeat(25);
    const { chunks, back } = rejoin(text, 10);
    expect(chunks.map((c) => c.text.length)).toEqual([10, 10, 5]);
    expect(back).toBe(text);
  });
});

describe("joinChunks", () => {
  it("번역을 원문 이음새로 붙인다", () => {
    const chunks = [
      { joiner: "", text: "A" },
      { joiner: "\n\n", text: "B" },
    ];
    expect(joinChunks(chunks, ["가", "나"])).toBe("가\n\n나");
  });
});
