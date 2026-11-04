import { describe, expect, it } from "vitest";
import { productKindConflict } from "@/lib/product-kind";

// 사례는 매칭 대기 큐에서 사람이 "아니에요" 를 누른 것들이다(2026-10-07 ~ 11-04)
describe("productKindConflict", () => {
  it("후보에만 붙은 체험판, 사운드트랙, VR 은 다른 상품이다", () => {
    expect(productKindConflict("The Isle Tide Hotel", "The Isle Tide Hotel Demo")).toBe(true);
    expect(productKindConflict("Shy Cats 2", "Shy Cats 2 Demo")).toBe(true);
    expect(productKindConflict("Asteroids Origin And Geometry Warp", "Asteroids Origin And Geometry Warp Trial")).toBe(true);
    expect(productKindConflict("Magical Girl Witch Trials", "Magical Girl Witch Trials: Digital Original Soundtrack")).toBe(true);
    expect(productKindConflict("The Elder Scrolls V: Skyrim", "The Elder Scrolls V: Skyrim VR")).toBe(true);
    expect(productKindConflict("Borderlands 2", "Borderlands 2 Season Pass")).toBe(true);
    expect(productKindConflict("あつまれ どうぶつの森", "あつまれ どうぶつの森 体験版")).toBe(true);
  });

  it("우리 행도 같은 갈래면 맞는 짝이다", () => {
    expect(productKindConflict("Arizona Sunshine VR Remake", "Arizona Sunshine VR Remake")).toBe(false);
    expect(productKindConflict("Shy Cats 2 Demo", "Shy Cats 2 - Demo")).toBe(false);
  });

  it("낱말 안에 든 글자는 갈래 낱말이 아니다", () => {
    expect(productKindConflict("Trials of Olympus", "Trials of Olympus")).toBe(false);
    expect(productKindConflict("Demon Slayer", "Demon Slayer -Kimetsu no Yaiba- The Hinokami Chronicles")).toBe(false);
    expect(productKindConflict("Ghost of Tsushima", "Ghost of Tsushima Director's Cut")).toBe(false);
  });

  it("우리 제목에만 VR 이 있고 후보에 없으면 막지 않는다(리메이크끼리 맞물린 사례)", () => {
    expect(productKindConflict("Arizona Sunshine VR Remake", "Arizona Sunshine Remake")).toBe(false);
  });
});
