// 한국어 판정 — 표본은 2026-10-07 KR 콘셉트 상세 응답의 상품명 그대로다.
import { describe, expect, it } from "vitest";
import { parsePsstoreKorean, psstoreConceptKorean } from "./language";

describe("parsePsstoreKorean", () => {
  it("쉼표 목록에 한국어가 있으면 지원", () => {
    expect(parsePsstoreKorean("금기의 시련 (중국어(간체자), 한국어, 영어, 일본어, 중국어(번체자))")).toEqual({ text: true });
    expect(parsePsstoreKorean("Food Truck Tycoon (한국어, 영어, 일본어, 중국어(번체자))")).toEqual({ text: true });
  });

  it("한국어판 표기도 지원", () => {
    expect(parsePsstoreKorean("UNCHARTED: The Nathan Drake Collection™ PlayStation®Hits (한국어판)")).toEqual({ text: true });
  });

  it("언어 목록인데 한국어가 없으면 미지원", () => {
    expect(parsePsstoreKorean("My Time at Portia (중국어(간체자), 영어, 일본어, 중국어(번체자))")).toEqual({ text: false });
    expect(parsePsstoreKorean("Arcade Archives VIOLENCE FIGHT (영어, 일본어)")).toEqual({ text: false });
    expect(parsePsstoreKorean("Atomic Owl PS4 & PS5 (영어)")).toEqual({ text: false });
    expect(parsePsstoreKorean("Need for Speed™ Payback (영어판)")).toEqual({ text: false });
    expect(parsePsstoreKorean("Carnival Games® (영어판/일어판)")).toEqual({ text: false });
  });

  it("괄호가 없거나 언어 괄호가 아니면 모른다(undefined)", () => {
    expect(parsePsstoreKorean("Ghost of Yotei")).toBeUndefined();
    expect(parsePsstoreKorean("Rooms: The Unsolvable Puzzle (게임)")).toBeUndefined();
    expect(parsePsstoreKorean("Some Game (PS4™ 버전)")).toBeUndefined();
    expect(parsePsstoreKorean("Some Game (디럭스판)")).toBeUndefined();
    expect(parsePsstoreKorean("Commandos (Windows)")).toBeUndefined();
    expect(parsePsstoreKorean(null)).toBeUndefined();
  });

  it("목록 앞의 다른 괄호는 보지 않고 끝 괄호만 본다", () => {
    expect(parsePsstoreKorean("Thing (2005) (영어)")).toEqual({ text: false });
    expect(parsePsstoreKorean("Thing (영어) Remastered")).toBeUndefined();
  });
});

describe("psstoreConceptKorean", () => {
  it("기본 상품이 일어판이어도 같은 콘셉트에 한국어판이 있으면 지원 — 디스가이아 5(200972)", () => {
    const names = ["마계전기 디스가이아 5 (한국어판)", "마계전기 디스가이아 5 (일어판)", "마계전기 디스가이아 5 체험판 (일어판)"];
    expect(psstoreConceptKorean("마계전기 디스가이아 5 (일어판)", names)).toEqual({ text: true });
  });

  it("언어 괄호가 다 한국어 없음이면 미지원", () => {
    expect(psstoreConceptKorean("AeternoBlade (영어판)", ["AeternoBlade (영어판)"])).toEqual({ text: false });
  });

  it("읽을 괄호가 하나도 없으면 모른다", () => {
    expect(psstoreConceptKorean("Rooms: The Unsolvable Puzzle (게임)", [null])).toBeUndefined();
    expect(psstoreConceptKorean(null, [])).toBeUndefined();
  });
});
