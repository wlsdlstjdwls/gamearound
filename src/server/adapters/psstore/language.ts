// PlayStation 상품명 꼬리의 지원 언어 괄호에서 한국어 지원 여부를 읽는다.
//
// PS 는 언어를 따로 주는 칸이 없고(콘셉트 상세 질의는 화이트리스트라 필드를 늘릴 수도 없다),
// 한국 스토어가 상품명 끝에 "(중국어(간체자), 한국어, 영어)" 나 "(한국어판)" 을 붙여 준다.
// 제목을 만들 때는 psstoreCleanTitle 이 이 괄호를 떼고, 여기서는 같은 괄호를 판정에 쓴다 — 추가 요청 0건.
//
// 글자(koText)만 읽는다. 괄호는 언어 이름만 늘어놓고 자막인지 음성인지 말하지 않아서
// 음성(koVoice)은 undefined 로 둔다 — false 를 적으면 "한국어 음성 없음" 이라는 거짓 단언이 된다.
import type { KoreanSupport } from "../types";
import { PSSTORE_KOREAN_LANGUAGE, PSSTORE_LANGUAGE_NAME, PSSTORE_LANGUAGE_SEPARATOR, PSSTORE_LANGUAGE_SUFFIX } from "./constants";

/** 지원 언어 표기를 뗀 제목. "PRAGMATA (한국어, 영어)" → "PRAGMATA" */
export function psstoreCleanTitle(name: string | null | undefined): string | null {
  const cleaned = (name ?? "").replace(PSSTORE_LANGUAGE_SUFFIX, "").trim();
  return cleaned || null;
}

/** 제목 끝 괄호 하나의 안쪽. "중국어(간체자)" 처럼 한 겹 안긴 괄호까지 품는다 */
const TRAILING_PAREN = /\(((?:[^()]|\([^()]*\))*)\)\s*$/;
/** 판 표기의 꼬리. "한국어판" 은 "한국어" 로, "영어판/일어판" 은 칸마다 뗀다 */
const EDITION_SUFFIX = /판$/;

/**
 * 상품명 하나의 한국어 지원.
 * - 꼬리 괄호가 언어 목록이고 한국어가 있으면 { text: true }
 * - 언어 목록인데 한국어가 없으면 { text: false } ("(영어판)", "(영어, 일본어)")
 * - 괄호가 없거나 언어 목록이 아니면 undefined — 모른다는 뜻이라 기존 값을 덮지 않는다
 */
export function parsePsstoreKorean(name: string | null | undefined): KoreanSupport | undefined {
  const inner = (name ?? "").match(TRAILING_PAREN)?.[1];
  if (!inner) return undefined;
  const items = inner.split(PSSTORE_LANGUAGE_SEPARATOR).map((s) => s.trim().replace(EDITION_SUFFIX, ""));
  // 한 칸이라도 언어 이름이 아니면 언어 괄호가 아니다 — "(게임)", "(PS4™ 버전)", "(디럭스판)" 을 미지원으로 읽지 않게
  if (items.length === 0 || !items.every((s) => PSSTORE_LANGUAGE_NAME.test(s))) return undefined;
  return { text: items.includes(PSSTORE_KOREAN_LANGUAGE) };
}

/**
 * 콘셉트 단위 판정. 기본 상품 하나만 보지 않고 같은 콘셉트의 상품명을 다 본다.
 *
 * 2026-10-07 실측: 표본 150 콘셉트 중 넷이 기본 상품은 "(일어판)" 이나 "(영어, 일본어)" 인데 같은 콘셉트에
 * "(한국어판)" 상품이 따로 있었다(마계전기 디스가이아 5, Odin Sphere Leifthrasir, 오메가 라비린스 Z, METAL GEAR SOLID V).
 * 기본 상품만 보면 한국 스토어에서 한국어판을 파는 게임을 "미지원" 으로 적는다.
 * 그래서 하나라도 한국어면 지원이고, 언어 괄호가 하나라도 있는데 한국어가 없을 때만 미지원이다.
 *
 * 맞바꾼 것: 콘셉트 상품 목록에 다른 게임이 섞이는 일이 있다(standard-product 주석의 Arcade Archives).
 * 그 게임만 한국어면 지원으로 잘못 적힌다 — 반대 방향(한국어판을 미지원으로 적기)보다 드물고 덜 해롭다고 봤다.
 */
export function psstoreConceptKorean(defaultName: string | null | undefined, productNames: Array<string | null | undefined>): KoreanSupport | undefined {
  const verdicts = [defaultName, ...productNames].map((n) => parsePsstoreKorean(n)?.text).filter((v) => v !== undefined);
  if (verdicts.length === 0) return undefined;
  return { text: verdicts.includes(true) };
}
