import { describe, expect, it } from "vitest";
import { withDiscoveredMedia } from "./store-apply";
import type { StoreSnapshot } from "@/server/adapters/types";
import type { StoreTarget } from "./store-targets";

const snapshot = (meta?: StoreSnapshot["meta"]): StoreSnapshot => ({
  platform: "ps5",
  storeExternalId: "10000730",
  storeUrl: "https://store.playstation.com/ko-kr/concept/10000730",
  listPrice: 112800,
  currentPrice: 112800,
  discountPct: 0,
  discountEndsAt: null,
  releaseDate: null,
  meta,
});

const target = (over: Partial<StoreTarget> = {}): StoreTarget => ({
  gameId: null,
  slug: null,
  externalId: "10000730",
  coverUrl: "https://img/cover.png?w=640",
  portraitUrl: "https://img/portrait.jpg?w=600",
  ...over,
});

describe("withDiscoveredMedia", () => {
  it("상세에 이미지가 없으면 발견 목록의 이미지를 얹는다", () => {
    const out = withDiscoveredMedia(snapshot({ titleEn: "Grand Theft Auto VI" }), target());
    expect(out.meta?.coverUrl).toBe("https://img/cover.png?w=640");
    expect(out.meta?.portraitUrl).toBe("https://img/portrait.jpg?w=600");
  });

  it("상세가 준 이미지가 이긴다 — 발견 목록은 대체재일 뿐이다", () => {
    const out = withDiscoveredMedia(snapshot({ titleEn: "X", coverUrl: "https://detail/cover.jpg" }), target());
    expect(out.meta?.coverUrl).toBe("https://detail/cover.jpg");
    expect(out.meta?.portraitUrl).toBe("https://img/portrait.jpg?w=600");
  });

  it("얹을 것이 없으면 원래 스냅샷을 그대로 돌려준다", () => {
    const s = snapshot({ titleEn: "X" });
    expect(withDiscoveredMedia(s, target({ coverUrl: null, portraitUrl: null }))).toBe(s);
  });

  it("meta 가 없는 스냅샷(기존 게임 가격 갱신)은 건드리지 않는다", () => {
    const s = snapshot();
    expect(withDiscoveredMedia(s, target())).toBe(s);
  });
});
