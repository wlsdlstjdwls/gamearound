import { describe, expect, it } from "vitest";
import { psstorePs4Offer, psstorePs4ProductId } from "./ps4-product";

const ps5 = { id: "UP0001-PPSA00001_00-GAME000000000000", name: "게임 (한국어판)" };

describe("psstorePs4ProductId", () => {
  it("기본 상품과 제목이 같은 PS4 상품을 고른다", () => {
    const products = [ps5, { id: "UP0001-CUSA00001_00-GAMEDX0000000000", name: "게임 디럭스 에디션" }, { id: "UP0001-CUSA00001_00-GAME000000000000", name: "게임" }];
    expect(psstorePs4ProductId(ps5, products)).toBe("UP0001-CUSA00001_00-GAME000000000000");
  });
  it("제목이 달라도 에디션, 체험판이 아닌 PS4 상품이 하나뿐이면 쓴다", () => {
    const products = [ps5, { id: "UP0001-CUSA00002_00-GAMEPS4000000000", name: "Game PS4" }, { id: "UP0001-CUSA00003_00-TRIAL00000000000", name: "게임 체험판" }];
    expect(psstorePs4ProductId(ps5, products)).toBe("UP0001-CUSA00002_00-GAMEPS4000000000");
  });
  it("후보가 여럿이고 제목이 다르면 고르지 않는다(에디션 값을 PS4 값으로 쓰지 않게)", () => {
    const products = [ps5, { id: "UP0001-CUSA00002_00-A000000000000000", name: "Game A" }, { id: "UP0001-CUSA00003_00-B000000000000000", name: "Game B" }];
    expect(psstorePs4ProductId(ps5, products)).toBeNull();
  });
  it("기본 상품이 PS4 면 따로 묻지 않는다(콘셉트 값이 곧 PS4 값)", () => {
    const ps4 = { id: "UP0001-CUSA00001_00-GAME000000000000", name: "게임" };
    expect(psstorePs4ProductId(ps4, [ps4])).toBeNull();
  });
});

describe("psstorePs4Offer", () => {
  it("\"PS4 & PS5\" 로 파는 상품은 같은 값으로 본다(2026-11-11 소닉×섀도우 제너레이션즈 실측)", () => {
    const d = { id: "UP0177-PPSA17597_00-SONICXSHADOWGENE", name: "소닉×섀도우 제너레이션즈 PS4 & PS5 (한국어)" };
    expect(psstorePs4Offer(d, [d])).toEqual({ kind: "same" });
  });
  it("콘셉트에 PS4 상품이 하나도 없으면 없다고 말한다(Paper Cut Mansion 실측)", () => {
    const d = { id: "EP5360-PPSA09516_00-PAPERCUTMANPS5EU", name: "Paper Cut Mansion" };
    expect(psstorePs4Offer(d, [d])).toEqual({ kind: "absent" });
  });
  it("PS4 상품이 있는데 고를 수 없으면 모른다고 한다(없음으로 단정하지 않는다)", () => {
    const products = [ps5, { id: "UP0001-CUSA00002_00-A000000000000000", name: "Game A" }, { id: "UP0001-CUSA00003_00-B000000000000000", name: "Game B" }];
    expect(psstorePs4Offer(ps5, products)).toBeNull();
  });
});
