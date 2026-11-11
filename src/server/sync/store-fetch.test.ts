// 상세 결과에 가격 배치 값(할인 기간)을 얹는 규칙(withBatchPrices). 네트워크 없이 어댑터를 스텁한다
import { describe, expect, it } from "vitest";
import { AdapterError, type StoreAdapter, type StoreSnapshot } from "@/server/adapters/types";
import { withBatchPrices, type Fetched } from "./store-fetch";

const snap = (over: Partial<StoreSnapshot>): StoreSnapshot =>
  ({ platform: "switch", region: "KR", storeExternalId: "1", storeUrl: "u", listPrice: 10000, currentPrice: 5000, discountPct: 50, ...over }) as StoreSnapshot;
const detailed = (id: string, over: Partial<StoreSnapshot> = {}): Fetched[number] => ({
  target: { gameId: "g", slug: "s", externalId: id },
  snapshot: snap({ storeExternalId: id, title: "제목", ...over } as Partial<StoreSnapshot>),
});
const adapter = (fetchMany?: StoreAdapter["fetchMany"]) => ({ source: "nintendo", minIntervalMs: 0, batchSize: 50, fetchMany }) as unknown as StoreAdapter;

describe("withBatchPrices", () => {
  it("상세가 못 준 할인 기간을 배치 값으로 채우고 상세의 다른 칸은 남긴다", async () => {
    const batch = new Map([["1", snap({ discountStartsAt: "2026-11-04T15:00:00Z", discountEndsAt: "2026-11-18T14:59:59Z" })]]);
    const [f] = await withBatchPrices("nintendo", adapter(async () => batch), [detailed("1")]);
    expect(f.snapshot.discountEndsAt).toBe("2026-11-18T14:59:59Z");
    expect((f.snapshot as { title?: string }).title).toBe("제목");
  });
  // 재시도하지 않는 오류로 던진다 — 재시도 간격(1s, 4s, 16s)을 테스트가 기다리지 않게
  it("배치가 실패하면 상세 값을 그대로 쓴다", async () => {
    const [f] = await withBatchPrices("nintendo", adapter(async () => { throw new AdapterError("x", "nintendo", false); }), [detailed("1", { currentPrice: 4000 })]);
    expect(f.snapshot.currentPrice).toBe(4000);
  });
  it("배치 경로가 없는 소스는 손대지 않는다", async () => {
    const input = [detailed("1")];
    expect(await withBatchPrices("psstore", adapter(undefined), input)).toBe(input);
  });
});
