// 다른 기기 행 값을 따로 물을 짝 고르기, 가격 칸만 떼기(sync/platform-siblings). DB, 네트워크 없이 본다
import { describe, expect, it } from "vitest";
import type { StoreSnapshot } from "@/server/adapters/types";
import { pickSiblings, siblingSnapshot } from "./platform-siblings";
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
