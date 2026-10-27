import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { chargeBilling, issueBillingKey } from "@/server/payments/toss-billing";
import { TossError } from "@/server/payments/toss";

const calls: { url: string; init: RequestInit }[] = [];
function stub(status: number, body: unknown) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init: RequestInit) => {
      calls.push({ url, init });
      return new Response(JSON.stringify(body), { status });
    }),
  );
}

beforeEach(() => {
  calls.length = 0;
  vi.stubEnv("TOSS_BILLING_SECRET_KEY", "test_sk_x");
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("issueBillingKey", () => {
  it("빌링 비밀 키로 부르고 카드 표시를 만든다", async () => {
    stub(200, { billingKey: "bk_1", cardCompany: "국민", card: { number: "4330****1234" } });
    expect(await issueBillingKey("ak", "ck")).toEqual({ billingKey: "bk_1", cardLabel: "국민 4330****1234" });
    expect(calls[0].url).toBe("https://api.tosspayments.com/v1/billing/authorizations/issue");
    expect((calls[0].init.headers as Record<string, string>).Authorization).toBe(`Basic ${Buffer.from("test_sk_x:").toString("base64")}`);
  });
});

describe("chargeBilling", () => {
  it("주문 번호를 멱등 키로 붙인다", async () => {
    stub(200, { paymentKey: "pk", method: "카드", approvedAt: "2026-10-27T00:00:00+09:00", receipt: { url: "https://r" } });
    const r = await chargeBilling({ billingKey: "bk/1", customerKey: "ck", amount: 19900, orderId: "member_a", orderName: "메이커 멤버십" });
    expect(r).toEqual({ paymentKey: "pk", method: "카드", approvedAt: "2026-10-27T00:00:00+09:00", receiptUrl: "https://r" });
    expect(calls[0].url).toBe("https://api.tosspayments.com/v1/billing/bk%2F1");
    expect((calls[0].init.headers as Record<string, string>)["Idempotency-Key"]).toBe("charge-member_a");
  });
  it("거절은 토스 코드와 문구로 던진다", async () => {
    stub(400, { code: "REJECT_CARD_COMPANY", message: "한도 초과" });
    const call = () => chargeBilling({ billingKey: "b", customerKey: "c", amount: 1, orderId: "o", orderName: "n" });
    await expect(call()).rejects.toMatchObject({ code: "REJECT_CARD_COMPANY", message: "한도 초과" });
    await expect(call()).rejects.toBeInstanceOf(TossError);
  });
});
