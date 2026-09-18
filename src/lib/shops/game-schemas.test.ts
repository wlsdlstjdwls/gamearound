import { describe, expect, it } from "vitest";
import { needsResearch, shopGameCreateSchema } from "./game-schemas";

describe("needsResearch", () => {
  it("찾은 말 그대로면 다시 찾게 하지 않는다", () => {
    expect(needsResearch("젤다의 전설", "젤다의 전설")).toBe(false);
  });

  it("띄어쓰기, 구두점 차이는 같은 것으로 본다 — 여기서 막으면 두 번째부터 아무도 안 읽는다", () => {
    expect(needsResearch("젤다의전설", "젤다의 전설")).toBe(false);
    expect(needsResearch("ELDEN RING:", " elden ring ")).toBe(false);
  });

  it("다른 게임을 등록하려 하면 막는다", () => {
    expect(needsResearch("젤다의 전설 무쌍", "젤다의 전설")).toBe(true);
  });

  it("찾지 않고 바로 등록하려 하면 막는다", () => {
    expect(needsResearch("아무 게임", "")).toBe(true);
  });
});

describe("shopGameCreateSchema", () => {
  it("제목과 매장만 있으면 선다 — 출시연도, 장르는 매장이 아는 값이 아니라 받지 않는다", () => {
    const r = shopGameCreateSchema.safeParse({ shopSlug: "yongsan", title: "구니스2" });
    expect(r.success).toBe(true);
  });

  it("빈 제목은 막는다", () => {
    expect(shopGameCreateSchema.safeParse({ shopSlug: "yongsan", title: "   " }).success).toBe(false);
  });
});
