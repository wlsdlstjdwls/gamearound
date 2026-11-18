import { describe, expect, it } from "vitest";
import { planXboxPreorder, type ExistingXboxPost, type XboxPreorderTarget } from "./xbox-preorder-bonuses";

const TODAY = "2026-11-18";
const BONUS_TEXT = "사전 주문 특전:\n- 아이템 A\n- 아이템 B\n\n본문";
const ROWS = [
  { name: "아이템 A", notes: ["사전 주문 특전"], endsOn: null },
  { name: "아이템 B", notes: ["사전 주문 특전"], endsOn: null },
];
const target: XboxPreorderTarget = { productId: "9AAA", gameId: "g1", storeUrl: "https://www.xbox.com/ko-KR/games/store/x/9AAA" };
const post = (over: Partial<ExistingXboxPost> = {}): ExistingXboxPost => ({
  id: "p1",
  productId: "9AAA",
  status: "published",
  gameId: "g1",
  url: target.storeUrl,
  title: "게임",
  bonuses: ROWS,
  ...over,
});
const plan = (over: Partial<Parameters<typeof planXboxPreorder>[0]>) =>
  planXboxPreorder({
    targets: [target],
    preorderIds: new Set(["9AAA"]),
    descriptions: new Map([["9AAA", { productId: "9AAA", title: "게임", description: BONUS_TEXT }]]),
    existing: [],
    today: TODAY,
    ...over,
  });

describe("planXboxPreorder", () => {
  it("새 특전은 글을 만든다", () => {
    expect(plan({})).toEqual([{ kind: "insert", target, title: "게임", rows: ROWS }]);
  });

  it("같으면 아무것도 쓰지 않는다(AGENTS §7)", () => {
    expect(plan({ existing: [post()] })).toEqual([]);
  });

  it("특전, 제목, 게임이 달라지면 고쳐 쓴다", () => {
    expect(plan({ existing: [post({ bonuses: ROWS.slice(0, 1) })] })[0].kind).toBe("replace");
    expect(plan({ existing: [post({ title: "옛 제목" })] })[0].kind).toBe("replace");
    expect(plan({ existing: [post({ gameId: "g2" })] })[0].kind).toBe("replace");
  });

  it("소개에서 특전이 빠지면 글을 지운다", () => {
    const descriptions = new Map([["9AAA", { productId: "9AAA", title: "게임", description: "그냥 소개" }]]);
    expect(plan({ descriptions, existing: [post()] })).toEqual([{ kind: "delete", postId: "p1", productId: "9AAA", why: "gone" }]);
  });

  it("소개를 못 읽은 상품은 건드리지 않는다 — 모름을 특전 없음으로 읽지 않는다", () => {
    expect(plan({ descriptions: new Map(), existing: [post()] })).toEqual([]);
  });

  it("관리자가 숨긴 글은 되살리지도 고치지도 않는다", () => {
    expect(plan({ existing: [post({ status: "hidden", bonuses: [] })] })).toEqual([]);
  });

  it("출시한 상품: 마감일이 남은 특전만 남기고, 하나도 없으면 지운다", () => {
    const mixed = [ROWS[0], { name: "조기 특전", notes: ["조기 구매 특전"], endsOn: "2026-12-23" }];
    const released = { targets: [], preorderIds: new Set<string>(), descriptions: new Map() };
    expect(plan({ ...released, existing: [post({ bonuses: mixed })] })).toEqual([{ kind: "trim", postId: "p1", productId: "9AAA", rows: [mixed[1]] }]);
    expect(plan({ ...released, existing: [post()] })).toEqual([{ kind: "delete", postId: "p1", productId: "9AAA", why: "released" }]);
    expect(plan({ ...released, existing: [post({ bonuses: [mixed[1]] })] })).toEqual([]);
  });

  it("상한에 걸려 이번에 못 읽은 예약 상품의 글은 출시로 보지 않는다", () => {
    expect(plan({ targets: [], descriptions: new Map(), existing: [post()] })).toEqual([]);
  });
});
