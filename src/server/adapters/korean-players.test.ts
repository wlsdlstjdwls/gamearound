// 한국어 지원과 인원수 파서 테스트 — 스토어마다 이미 받는 응답에서 줍는 값들(2026-10-06 실측 표본).
// 지키는 규칙은 하나다: 스토어가 말하지 않은 칸은 undefined(모른다)로 두고, false(없다)로 짐작하지 않는다.
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { parseSteamKorean } from "./steam";
import { parseEpicContentKorean, parseEpicKorean } from "./epic";
import { parseXboxKorean, parseXboxMultiplayer } from "./xbox-attributes";
import { parseXboxProduct } from "./xbox";
import { parseNintendoKorean, parseNintendoProduct } from "./nintendo";
import { parseJpSearch } from "./nintendo/search-jp";

const text = (name: string): string => readFileSync(fileURLToPath(new URL(`./__fixtures__/${name}`, import.meta.url)), "utf8");
const json = (name: string): unknown => JSON.parse(text(name));

describe("parseSteamKorean", () => {
  // 엘든 링 appdetails(koreana) 실응답 — 음성은 영어뿐이다
  const eldenRing =
    "영어<strong>*</strong>, 프랑스어, 이탈리아어, 독일어, 스페인어 - 스페인, 일본어, 한국어, 폴란드어<br><strong>*</strong>음성이 지원되는 언어";

  it("한국어가 있고 별표가 없으면 글자만 지원한다", () => {
    expect(parseSteamKorean(eldenRing)).toEqual({ text: true, voice: false });
  });

  it("한국어 뒤에 별표가 붙으면 음성도 지원한다", () => {
    expect(parseSteamKorean("English<strong>*</strong>, Korean<strong>*</strong><br><strong>*</strong>languages with full audio support")).toEqual({
      text: true,
      voice: true,
    });
  });

  it("목록에 한국어가 없으면 둘 다 없다고 말한다", () => {
    expect(parseSteamKorean("English<strong>*</strong>, Japanese")).toEqual({ text: false, voice: false });
  });

  // 각주 안의 낱말을 언어로 읽지 않는다
  it("각주는 목록으로 치지 않는다", () => {
    expect(parseSteamKorean("English<br><strong>*</strong>Korean")).toEqual({ text: false, voice: false });
  });

  it("문자열이 없으면 모른다", () => {
    expect(parseSteamKorean(undefined)).toBeUndefined();
    expect(parseSteamKorean("  ")).toBeUndefined();
  });
});

describe("parseEpicKorean", () => {
  it("갈래가 따로 온 줄을 읽는다(잇 테이크 투)", () => {
    expect(parseEpicKorean(["AUDIO: English", "TEXT: English, Japanese, Korean, Polish"])).toEqual({ text: true, voice: false });
  });

  it("한 줄에 파이프로 묶인 갈래를 읽는다(앨런 웨이크 2)", () => {
    expect(parseEpicKorean(["AUDIO: English, Korean | TEXT: English, Korean"])).toEqual({ text: true, voice: true });
  });

  it("목록 끝의 마침표를 떼고 읽는다", () => {
    expect(parseEpicKorean(["TEXT: English, Korean. ", "AUDIO: English, Korean."])).toEqual({ text: true, voice: true });
  });

  it("머리말이 없으면 음성인지 글자인지 몰라 짐작하지 않는다", () => {
    expect(parseEpicKorean(["English, Korean"])).toBeUndefined();
  });

  it("한쪽 갈래만 있으면 다른 쪽은 모른다", () => {
    expect(parseEpicKorean(["TEXT: Korean"])).toEqual({ text: true, voice: undefined });
  });

  it("콘텐츠 응답 전체에서 처음 만난 언어 줄을 쓴다", () => {
    expect(parseEpicContentKorean(json("epic-product-requirements.json"))).toEqual({ text: true, voice: false });
  });
});

describe("Xbox 인원수와 한국어", () => {
  it("속성 이름별 최대 인원을 로컬과 온라인으로 나눈다(잇 테이크 투)", () => {
    expect(
      parseXboxMultiplayer([
        { Name: "XblLocalCoop", Maximum: 2 },
        { Name: "XblOnlineCoop", Maximum: 2 },
        { Name: "XblLocalMultiPlayer", Maximum: 2 },
        { Name: "Capability4k", Maximum: null },
      ]),
    ).toEqual({ localMax: 2, onlineMax: 2, coop: true });
  });

  // 협동 속성이 없다고 "협동 아님" 으로 읽으면 스팀이 준 협동 표시를 매번 지운다
  it("협동 속성이 없으면 협동을 말하지 않는다", () => {
    expect(parseXboxMultiplayer([{ Name: "XblOnlineMultiPlayer", Maximum: 6 }])).toEqual({ localMax: undefined, onlineMax: 6, coop: undefined });
  });

  it("인원 속성이 하나도 없으면 모른다", () => {
    expect(parseXboxMultiplayer([{ Name: "Capability4k", Maximum: null }])).toBeUndefined();
    expect(parseXboxMultiplayer(null)).toBeUndefined();
  });

  it("SKU 언어에 ko 가 있으면 한국어판이고, 음성은 모른다", () => {
    expect(parseXboxKorean([["en", "ja"], ["ko-KR"]])).toEqual({ text: true });
    expect(parseXboxKorean([["en", "ja"]])).toEqual({ text: false });
    expect(parseXboxKorean([null, []])).toBeUndefined();
  });

  it("상품 응답에서 두 값을 같이 꺼낸다(엘든 링)", () => {
    const snap = parseXboxProduct(json("xbox-product.json"), "9P3J32CTXLRZ");
    expect(snap.koText).toBe(true);
    expect(snap.koVoice).toBeUndefined();
  });
});

describe("닌텐도 인원수와 한국어", () => {
  it("대응언어 목록에서 한국어를 찾는다", () => {
    expect(parseNintendoKorean("한국어, 영어, 일본어")).toEqual({ text: true });
    expect(parseNintendoKorean("영어, 일본어")).toEqual({ text: false });
    expect(parseNintendoKorean("")).toBeUndefined();
  });

  // 마리오 카트 8 디럭스: 본체 1대 1~4, 인터넷 2~12, 로컬 통신 2~8(담지 않는다)
  it("상품 페이지에서 본체 인원, 인터넷 인원, 한국어를 꺼내고 협동은 짐작하지 않는다", () => {
    const snap = parseNintendoProduct(text("nintendo-product-multiplayer.html"), "70010000009373");
    expect(snap.koText).toBe(true);
    expect(snap.meta?.multiplayer).toEqual({ localMax: 4, onlineMax: 12, solo: true });
  });

  it("일본 검색 응답의 인터넷 인원을 읽고 협동은 짐작하지 않는다", () => {
    const [item] = parseJpSearch({
      result: {
        total: 1,
        items: [{ id: "70010000000153", title: "マリオカート8 デラックス", hard: "1_HAC", player: ["1-4"], nplayer: ["2-12"] }],
      },
    });
    expect(item.meta?.multiplayer).toEqual({ localMax: 4, onlineMax: 12, solo: true });
  });
});
