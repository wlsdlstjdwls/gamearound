import { describe, expect, it } from "vitest";
import { alertPayload, alertPushCode, alertVars } from "@/lib/alerts/payload";
import { copyMail, copyPush, copyWeb } from "./copy";

const input = { gameTitle: "하데스 II", platform: "steam", price: 27000, currency: "KRW" as const, discountPct: 30 };

describe("가격 알림 값과 웹푸시 템플릿", () => {
  it("할인이면 할인 중 템플릿, 아니면 값 내림 템플릿", () => {
    expect(alertPushCode(30)).toBe("push.price_sale");
    expect(alertPushCode(0)).toBe("push.price_drop");
  });
  it("시드 문구로 지으면 기본 글과 같다(옮기기 전과 같은 글이 간다)", () => {
    const copy = { "push.price_sale": { subject: "{게임} 할인 중", body: "{기종} {가격} ({할인율}% 할인)", active: true } };
    expect(copyPush(copy, alertPushCode(30), alertVars(input), alertPayload(input))).toEqual(alertPayload(input));
  });
  it("미사용이면 null, 없으면 기본 글", () => {
    const off = { "push.price_sale": { subject: "x", body: "y", active: false } };
    expect(copyPush(off, "push.price_sale", alertVars(input), alertPayload(input))).toBeNull();
    expect(copyWeb({}, "web.price_drop", {}, "기본")).toBe("기본");
  });
  it("메일 미리 보기는 링크를 걷고, 템플릿이 없으면 missing", () => {
    const copy = { "mail.price_alert": { subject: "[손전등] {제목}", body: "<b>{제목}</b>\n{내용}\n<a href=\"{링크}\">게임 보러 가기</a>", active: true } };
    expect(copyMail(copy, "mail.price_alert", alertVars(input))).toEqual({ subject: "[손전등] 하데스 II 할인 중", text: "하데스 II 할인 중\nSteam 27,000원 (30% 할인)" });
    expect(copyMail({}, "mail.price_alert", {})).toBe("missing");
  });
});
