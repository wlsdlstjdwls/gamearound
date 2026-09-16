import { describe, expect, it } from "vitest";
import { addonKindOf, byAddonKind } from "./addon-kind";

describe("addonKindOf", () => {
  it("확장팩, 시즌 패스를 가장 위 갈래로 본다", () => {
    expect(addonKindOf("MONSTER HUNTER RISE: SUNBREAK Expansion")).toBe("expansion");
    expect(addonKindOf("철권 8 시즌 3 패스")).toBe("expansion");
  });

  it("두 낱말이 겹치면 큰 쪽이 이긴다", () => {
    expect(addonKindOf("시즌 패스 코스튬 세트")).toBe("expansion");
  });

  it("사운드트랙, 아트북은 부록으로 본다", () => {
    expect(addonKindOf("Gangs Of Sherwood — Digital Soundtrack")).toBe("media");
    expect(addonKindOf("인디비지블 게임 사운드트랙")).toBe("media");
    expect(addonKindOf("Creatures Of Ava: Artbook")).toBe("media");
  });

  it("꾸미기 항목을 가려낸다", () => {
    expect(addonKindOf("Monster Hunter Rise - 변신 덧입는 장비 「몬디네 시리즈」")).toBe("cosmetic");
    expect(addonKindOf('Monster Hunter Rise - "Elegant" hairstyle')).toBe("cosmetic");
    expect(addonKindOf("Hunter Voice: Jae")).toBe("cosmetic");
    // 활용형이 둘이다 — 어간 "덧입" 만 본다
    expect(addonKindOf("추가 덧입히기 무기 팩 「로스트코드」 14종")).toBe("cosmetic");
    expect(addonKindOf("사냥꾼의 차림새 티켓 3장")).toBe("cosmetic");
    expect(addonKindOf("추가 음성 「갈레아스」")).toBe("cosmetic");
    expect(addonKindOf("추가 스탬프 세트 「스페셜 스탬프1」")).toBe("cosmetic");
    expect(addonKindOf("추가 머리 모양 「땋은 머리」")).toBe("cosmetic");
  });

  it("재화를 가려낸다", () => {
    expect(addonKindOf("FIFA Points 2200 Coins")).toBe("currency");
    expect(addonKindOf("젬 500 코인 팩")).toBe("currency");
  });

  it("골드 에디션을 재화로 오해하지 않는다 — gold 는 규칙에서 뺐다", () => {
    expect(addonKindOf("Gold Edition Upgrade")).toBe("unknown");
  });

  it("아무 단서도 없으면 unknown 이고, 꾸미기보다 위에 선다", () => {
    expect(addonKindOf("Sunbreak")).toBe("unknown");
  });
});

describe("byAddonKind", () => {
  it("확장팩을 위로, 꾸미기와 부록을 아래로 보낸다", () => {
    const rows = [
      { title: "변신 덧입는 장비 「몬디네 시리즈」", price: 3700 },
      { title: "Original Soundtrack", price: 9900 },
      { title: "Sunbreak", price: 6720 },
      { title: "MONSTER HUNTER RISE: SUNBREAK Expansion", price: 6720 },
      { title: "코인 1000개", price: 30000 },
    ];
    expect([...rows].sort(byAddonKind).map((r) => r.title)).toEqual([
      "MONSTER HUNTER RISE: SUNBREAK Expansion",
      "Sunbreak",
      "변신 덧입는 장비 「몬디네 시리즈」",
      "Original Soundtrack",
      "코인 1000개",
    ]);
  });

  it("갈래가 같으면 비싼 것이 위다 — 제목에 확장팩이라 안 적힌 본편급을 특전 위로 올린다", () => {
    const rows = [
      { title: "【헌터 특전】엘가도 이득 패키지", price: 0 },
      { title: "MONSTER HUNTER RISE: SUNBREAK", price: 6720 },
    ];
    expect([...rows].sort(byAddonKind).map((r) => r.title)).toEqual([
      "MONSTER HUNTER RISE: SUNBREAK",
      "【헌터 특전】엘가도 이득 패키지",
    ]);
  });

  it("값을 모르는 줄은 무료보다도 아래다 — 수집이 안 된 것과 공짜는 다른 말이다", () => {
    const rows = [{ title: "가 팩", price: null }, { title: "나 팩", price: 0 }];
    expect([...rows].sort(byAddonKind).map((r) => r.title)).toEqual(["나 팩", "가 팩"]);
  });

  it("갈래도 값도 같으면 제목 순이라 순서가 흔들리지 않는다", () => {
    const rows = [{ title: "나 코스튬", price: 1900 }, { title: "가 코스튬", price: 1900 }];
    expect([...rows].sort(byAddonKind).map((r) => r.title)).toEqual(["가 코스튬", "나 코스튬"]);
  });
});
