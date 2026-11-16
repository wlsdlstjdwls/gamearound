// 다른 기기 행 값을 따로 물을 짝 고르기, 가격 칸만 떼기(sync/platform-siblings). DB, 네트워크 없이 본다
import { describe, expect, it } from "vitest";
import type { StoreSnapshot } from "@/server/adapters/types";
import { absentDecision, pickSiblings, siblingSnapshot } from "./platform-siblings";
import type { Fetched } from "./store-fetch";

const snap = (over: Partial<StoreSnapshot>): StoreSnapshot =>
  ({ platform: "ps5", storeExternalId: "100", storeUrl: "https://store/concept/100", listPrice: 50000, currentPrice: 50000, discountPct: 0, ...over }) as StoreSnapshot;
const item = (gameId: string | null, over: Partial<StoreSnapshot> = {}): Fetched[number] => ({
  target: { gameId, slug: gameId, externalId: "100" },
  snapshot: snap({ platformProducts: [{ platform: "ps4", kind: "product", productId: "UP0001-CUSA00001_00-GAME" }], ...over }),
});

describe("pickSiblings", () => {
  it("그 기기 행이 이미 있는 게임만 고른다(새 행은 만들지 않는다)", () => {
    const picked = pickSiblings([item("a"), item("b")], new Set(["a:ps4"]), 10);
    expect(picked.map((w) => w.item.target.gameId)).toEqual(["a"]);
  });
  it("요청이 안 나가는 same 은 상한에 세지 않는다", () => {
    const same = item("s", { platformProducts: [{ platform: "ps4", kind: "same" }] });
    const picked = pickSiblings([item("a"), same, item("b")], new Set(["a:ps4", "s:ps4", "b:ps4"]), 1);
    expect(picked.map((w) => w.item.target.gameId)).toEqual(["a", "s"]);
  });
  it("신규 대상과 본편과 같은 기기는 건너뛰고 상한을 지킨다", () => {
    const fetched = [item(null), item("a", { platform: "ps4" }), item("b"), item("c")];
    expect(pickSiblings(fetched, new Set(["a:ps4", "b:ps4", "c:ps4"]), 1).map((w) => w.item.target.gameId)).toEqual(["b"]);
  });
});

describe("siblingSnapshot", () => {
  it("상품의 가격, 할인 기간만 가져오고 주소, 외부 id 는 본편 것을 쓴다", () => {
    const product = snap({ platform: "ps4", storeExternalId: "UP0001-CUSA00001_00-GAME", storeUrl: "https://store/product/x", currentPrice: 20000, discountPct: 60, discountEndsAt: "2026-11-20T15:00:00.000Z" });
    const s = siblingSnapshot(snap({}), "ps4", product);
    expect(s).toMatchObject({ platform: "ps4", storeExternalId: "100", storeUrl: "https://store/concept/100", currentPrice: 20000, discountEndsAt: "2026-11-20T15:00:00.000Z" });
    expect(s.meta).toBeUndefined();
  });
});

describe("absentDecision", () => {
  const concept = "10004410";
  it("링크 없는 행(병합 때 들어와 숨은 값)은 상품 페이지로 물어본다", () => {
    expect(absentDecision({ storeUrl: null, storeExternalId: "psprices:123" }, concept, true)).toBe("ask");
  });
  it("앞 회차에 같은 콘셉트로 확인된 행은 요청 없이 같은 값", () => {
    expect(absentDecision({ storeUrl: "https://store.playstation.com/ko-kr/concept/10004410", storeExternalId: concept }, concept, true)).toBe("same");
  });
  it("행이 없거나, 물어볼 기본 상품을 모르거나, 다른 값을 쥔 링크 있는 행이면 지금처럼 없음", () => {
    expect(absentDecision(undefined, concept, true)).toBe("absent");
    expect(absentDecision({ storeUrl: null, storeExternalId: "psprices:123" }, concept, false)).toBe("absent");
    expect(absentDecision({ storeUrl: "https://x", storeExternalId: "OTHER" }, concept, true)).toBe("absent");
  });
});
