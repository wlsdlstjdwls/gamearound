// psstore 파서 — 구독 포함 판정과 가격 선택이 서로 섞이지 않는지 잠근다.
// 표본은 2026-09-14 실측 응답의 webcta 모양을 그대로 줄인 것이다.
import { describe, expect, it } from "vitest";
import { parsePsstoreConcept, psstoreSubscriptionKeys } from "./parse";

const cta = (type: string, price: Record<string, unknown> | null) => ({ type, price });

describe("psstoreSubscriptionKeys", () => {
  it("게임 카탈로그 버튼은 스페셜, 클래식 컬렉션은 디럭스로 읽는다", () => {
    expect(psstoreSubscriptionKeys([cta("UPSELL_PS_PLUS_GAME_CATALOG", null)])).toEqual(["psplus_special"]);
    expect(psstoreSubscriptionKeys([cta("UPSELL_PS_PLUS_CLASSIC_GAME_COLLECTION", null)])).toEqual(["psplus_deluxe"]);
  });

  it("체험판과 할인 버튼은 포함이 아니다", () => {
    // "2시간 체험", "10시간 체험", "EA Play로 10% 할인" — 가입해도 게임이 주어지지 않는다
    const ctas = [
      cta("UPSELL_PS_PLUS_TRIAL", null),
      cta("UPSELL_EA_ACCESS_PLAY_FIRST_TRIAL", null),
      cta("UPSELL_EA_ACCESS_DISCOUNT", null),
    ];
    expect(psstoreSubscriptionKeys(ctas)).toEqual([]);
  });

  it("타사 구독도 포함이면 읽고, 한 게임이 여러 구독에 들 수 있다", () => {
    const ctas = [cta("UPSELL_PS_PLUS_GAME_CATALOG", null), cta("UPSELL_UBISOFT_PLUS_FREE", null)];
    expect(psstoreSubscriptionKeys(ctas)).toEqual(["psplus_special", "ubisoft_plus_ps"]);
  });

  it("같은 구독 버튼이 두 번 와도 한 번만 센다", () => {
    const ctas = [cta("UPSELL_PS_PLUS_GAME_CATALOG", null), cta("UPSELL_PS_PLUS_GAME_CATALOG", null)];
    expect(psstoreSubscriptionKeys(ctas)).toEqual(["psplus_special"]);
  });

  it("버튼이 없으면 빈 배열 — undefined 가 아니다(빈 배열은 '어디에도 안 들었다'는 단언이다)", () => {
    expect(psstoreSubscriptionKeys(null)).toEqual([]);
    expect(psstoreSubscriptionKeys([])).toEqual([]);
  });
});

describe("parsePsstoreConcept", () => {
  /** 사이버펑크 2077(234567) 실측을 줄인 것 — UPSELL 이 먼저 오고 구매 버튼이 뒤에 온다 */
  const raw = {
    data: {
      conceptRetrieve: {
        id: "234567",
        releaseDate: { value: "2020-12-10T00:00:00Z" },
        products: [{ id: "EP4497-PPSA04029_00-0000000000000N22" }],
        defaultProduct: {
          id: "EP4497-PPSA04029_00-0000000000000N22",
          name: "사이버펑크 2077 (한국어, 영어)",
          invariantName: "Cyberpunk 2077",
          webctas: [
            cta("UPSELL_PS_PLUS_GAME_CATALOG", { applicability: "UPSELL", basePriceValue: 54800, discountedValue: 0, endTime: null }),
            cta("ADD_TO_CART", { applicability: "APPLICABLE", basePriceValue: 54800, discountedValue: 21920, endTime: "1790175540000" }),
          ],
        },
      },
    },
  };

  it("구독 가입가를 할인으로 읽지 않고, 같은 버튼을 구독 축으로 넘긴다", () => {
    const snap = parsePsstoreConcept(raw, "234567");
    // 가격은 구매 버튼 쪽 — 0원 100% 할인이 아니다
    expect(snap.listPrice).toBe(54800);
    expect(snap.currentPrice).toBe(21920);
    expect(snap.discountPct).toBe(60);
    // 버린 UPSELL 버튼은 구독 축에서 살아난다
    expect(snap.subscriptionKeys).toEqual(["psplus_special"]);
  });

  it("구독 버튼이 없는 게임은 빈 배열을 실어 기존 포함 기록을 내리게 한다", () => {
    const plain = {
      data: {
        conceptRetrieve: {
          ...raw.data.conceptRetrieve,
          defaultProduct: {
            ...raw.data.conceptRetrieve.defaultProduct,
            webctas: [cta("ADD_TO_CART", { applicability: "APPLICABLE", basePriceValue: 34800, discountedValue: 34800, endTime: null })],
          },
        },
      },
    };
    expect(parsePsstoreConcept(plain, "234567").subscriptionKeys).toEqual([]);
  });
});
