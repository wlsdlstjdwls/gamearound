// 가격 가드 테스트. 2026-09-17 사고를 그대로 재현하는 줄이 아래 "출시예정만 든 배치" 다.
import { describe, expect, it } from "vitest";
import { expectsPrice, isoDay, judgePrices } from "./price-guard";
import type { StoreSnapshot } from "@/server/adapters/types";

const TODAY = "2026-09-21";

const snap = (over: Partial<StoreSnapshot> = {}): StoreSnapshot => ({
  platform: "steam",
  storeExternalId: "1",
  storeUrl: "https://x",
  listPrice: 10_000,
  currentPrice: 10_000,
  discountPct: 0,
  releaseDate: "2020-01-01",
  ...over,
});

const many = (n: number, over: Partial<StoreSnapshot>) => Array.from({ length: n }, () => snap(over));

describe("expectsPrice", () => {
  it("나온 게임은 값이 있어야 한다", () => {
    expect(expectsPrice(snap({ releaseDate: "2020-01-01" }), TODAY)).toBe(true);
  });
  it("오늘 나온 게임도 포함한다", () => {
    expect(expectsPrice(snap({ releaseDate: TODAY }), TODAY)).toBe(true);
  });
  it("아직 안 나온 게임은 값이 없는 게 정상이다", () => {
    expect(expectsPrice(snap({ releaseDate: "2027-01-01" }), TODAY)).toBe(false);
  });
  it("출시일을 모르면 판정을 '모른다' 쪽으로 기울인다", () => {
    expect(expectsPrice(snap({ releaseDate: null }), TODAY)).toBe(false);
  });
});

describe("judgePrices", () => {
  it("나온 게임의 가격이 통째로 비면 막는다 — 가드가 잡으려는 사고", () => {
    const v = judgePrices(many(50, { currentPrice: null }), TODAY);
    expect(v.blocked).toBe(true);
    expect(v.expected).toBe(50);
  });

  /**
   * 2026-09-17 ~ 21 에 실제로 일어난 일. 발견 첫 패스가 출시예정이고 크론 discover 몫은
   * 배치 전부가 신규 시드였다(seedShare: 1). 옛 가드는 "90건 중 90건이 0원/null" 로 읽고
   * 매 실행 반영을 통째로 생략했다 — 닷새 동안 스팀 신규 등록이 0건이었다.
   */
  it("출시예정만 든 배치는 막지 않는다 — 값이 없는 게 정상이다", () => {
    const v = judgePrices(many(90, { currentPrice: null, listPrice: null, releaseDate: "2027-03-01" }), TODAY);
    expect(v.blocked).toBe(false);
    expect(v.expected).toBe(0);
    expect(v.skipped).toBe(90);
  });

  it("무료 게임의 0원은 사고가 아니다 — 어댑터가 무료(0)와 미판매(null)를 이미 가른다", () => {
    const v = judgePrices(many(50, { currentPrice: 0, listPrice: 0 }), TODAY);
    expect(v.blocked).toBe(false);
    expect(v.unreadable).toBe(0);
  });

  it("출시예정이 섞여도 나온 게임 쪽 비율로 판정한다", () => {
    const v = judgePrices(
      [...many(20, { currentPrice: null, releaseDate: "2027-01-01" }), ...many(20, { currentPrice: null })],
      TODAY,
    );
    expect(v.blocked).toBe(true);
    expect(v.expected).toBe(20);
    expect(v.skipped).toBe(20);
  });

  it("모수가 너무 적으면 판정하지 않는다 — 몇 건으로는 사고인지 알 수 없다", () => {
    const v = judgePrices(many(5, { currentPrice: null }), TODAY);
    expect(v.blocked).toBe(false);
  });

  it("절반을 넘어야 막는다", () => {
    const half = [...many(10, { currentPrice: null }), ...many(10, {})];
    expect(judgePrices(half, TODAY).blocked).toBe(false);
    expect(judgePrices([...half, snap({ currentPrice: null })], TODAY).blocked).toBe(true);
  });
});

describe("isoDay", () => {
  it("UTC 날짜 앞 열 글자", () => {
    expect(isoDay(new Date("2026-09-21T15:04:05Z"))).toBe("2026-09-21");
  });
});
