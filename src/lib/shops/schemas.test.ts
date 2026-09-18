// 입점 신청 검증 테스트 — 순수 함수만. 네트워크, DB 를 건드리지 않는다.
import { describe, expect, it } from "vitest";
import { normalizeBizRegNo, shopApplicationSchema, shopReviewSchema } from "./schemas";
import { SHOP_MESSAGES } from "./messages";

function application(over: Record<string, unknown> = {}) {
  return {
    shopType: "business",
    name: "우리동네 게임샵",
    slug: "dongne-game",
    bizRegNo: "123-45-67890",
    addressType: "offline",
    address: "서울시 어딘가 1로 2",
    phone: "02-123-4567",
    ...over,
  };
}

describe("shopApplicationSchema", () => {
  it("사업자번호의 하이픈을 받아서 숫자 10자리로 본다 — 사람은 적힌 대로 옮겨 적는다", () => {
    expect(shopApplicationSchema.safeParse(application()).success).toBe(true);
    expect(normalizeBizRegNo("123-45-67890")).toBe("1234567890");
  });

  it("예약 slug 는 막는다 — /shops/admin 을 가리는 매장이 생기면 그 화면이 통째로 사라진다", () => {
    const parsed = shopApplicationSchema.safeParse(application({ slug: "admin" }));
    expect(parsed.success).toBe(false);
    expect(parsed.error?.issues[0]?.message).toBe(SHOP_MESSAGES.slugReserved);
  });

  it("주소에 쓸 수 없는 글자는 막는다", () => {
    expect(shopApplicationSchema.safeParse(application({ slug: "우리동네" })).success).toBe(false);
    expect(shopApplicationSchema.safeParse(application({ slug: "shop_1" })).success).toBe(false);
    expect(shopApplicationSchema.safeParse(application({ slug: "-shop" })).success).toBe(false);
  });

  it("오프라인 매장은 주소가 있어야 한다 — 손님이 찾아가는 곳이다", () => {
    const parsed = shopApplicationSchema.safeParse(application({ address: "" }));
    expect(parsed.success).toBe(false);
    expect(parsed.error?.issues[0]?.message).toBe(SHOP_MESSAGES.addressRequired);
  });

  it("온라인만 하는 매장은 주소 없이 통과한다", () => {
    expect(shopApplicationSchema.safeParse(application({ addressType: "online_only", address: "" })).success).toBe(true);
  });

  it("사업자 매장은 사업자번호가 숫자 10자리여야 한다", () => {
    expect(shopApplicationSchema.safeParse(application({ bizRegNo: "12345" })).success).toBe(false);
    expect(shopApplicationSchema.safeParse(application({ bizRegNo: "" })).success).toBe(false);
  });

  it("개인 판매자는 사업자번호를 묻지 않는다 — 중고거래를 켜는 날 규칙만 갈린다", () => {
    expect(shopApplicationSchema.safeParse(application({ shopType: "personal", bizRegNo: "", addressType: "none", address: "" })).success).toBe(true);
  });
});

describe("shopReviewSchema", () => {
  const shopId = "8f4e2b1a-0c3d-4e5f-8a9b-0c1d2e3f4a5b";

  it("승인에는 사유가 없어도 된다", () => {
    expect(shopReviewSchema.safeParse({ shopId, decision: "approve" }).success).toBe(true);
  });

  it("반려와 정지에는 사유가 필수다 — 이유 없는 반려는 고쳐서 다시 낼 방법이 없다", () => {
    expect(shopReviewSchema.safeParse({ shopId, decision: "reject" }).success).toBe(false);
    expect(shopReviewSchema.safeParse({ shopId, decision: "suspend" }).success).toBe(false);
    expect(shopReviewSchema.safeParse({ shopId, decision: "reject", reason: "사업자 정보가 확인되지 않아요" }).success).toBe(true);
  });

  it("매장 id 가 uuid 가 아니면 막는다 — 폼에 남의 값을 박아 보내는 길이 이 도메인의 첫 공격이다", () => {
    expect(shopReviewSchema.safeParse({ shopId: "1", decision: "approve" }).success).toBe(false);
  });
});
