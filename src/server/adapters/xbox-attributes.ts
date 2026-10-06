// Xbox 상품의 인원수와 한국어 지원 — 이미 받는 displaycatalog 응답에서 줍는다(요청이 늘지 않는다).
//
// xbox.ts 에서 떼어 낸 이유: 그 파일이 이미 300줄을 넘었고, 여기는 응답 일부를 받아 값을 내는 순수 규칙이라 따로 시험하기 좋다.
//
// 2026-10-06 실측(잇 테이크 투 9NXVC0482QS5, 엘든 링 9P3J32CTXLRZ):
// - Properties.Attributes 에 XblLocalCoop, XblOnlineMultiPlayer 같은 이름과 Minimum, Maximum 이 온다.
//   잇 테이크 투: 로컬 협동 2~2, 온라인 협동 2~2 / 엘든 링: 온라인 협동 2~3, 온라인 멀티 2~6(로컬 항목 없음).
// - "MultiPlayer" 는 대전을 뜻하지 않는다(협동 게임에도 붙는다). 그래서 PvP 는 여기서 말하지 않는다.
// - DisplaySkuAvailabilities[].Sku.MarketProperties[].SupportedLanguages 에 "ko" 가 있으면 한국어판이다.
//   화면, 자막, 음성은 가르지 않는다 — 그 세 갈래는 xbox.com 상품 페이지에만 있고 게임마다 요청이 1건 는다.
import type { KoreanSupport, StoreSnapshot } from "./types";

/** 인원 속성 이름. 로컬은 한 기기(화면 분할 포함), 온라인은 네트워크 너머다 */
export const XBOX_PLAYER_ATTRS = {
  localCoop: "XblLocalCoop",
  localMulti: "XblLocalMultiPlayer",
  onlineCoop: "XblOnlineCoop",
  onlineMulti: "XblOnlineMultiPlayer",
} as const;

/** SupportedLanguages 의 한국어 코드. "ko" 말고 "ko-kr" 로 적는 상품도 있어 앞머리로 본다 */
export const XBOX_KOREAN_CODE = "ko";

export type XboxAttribute = { Name?: string | null; Maximum?: number | null };

type Multiplayer = NonNullable<NonNullable<StoreSnapshot["meta"]>["multiplayer"]>;

/** 같은 이름 묶음 중 가장 큰 Maximum. 하나도 없으면 undefined(모른다) */
function maxOf(attrs: XboxAttribute[], names: string[]): number | undefined {
  const values = attrs.filter((a) => a.Name && names.includes(a.Name) && typeof a.Maximum === "number" && a.Maximum > 0).map((a) => a.Maximum as number);
  return values.length > 0 ? Math.max(...values) : undefined;
}

/**
 * 속성 목록 → 멀티플레이 정보. 인원 속성이 하나도 없으면 undefined 다.
 *
 * 협동은 있을 때만 true 로 말하고, 없다고는 말하지 않는다(undefined). 속성이 빠진 상품이 흔해서
 * (엘든 링에는 로컬 항목이 아예 없다) "없음" 으로 읽으면 스팀이 준 협동 표시를 매번 지운다.
 */
export function parseXboxMultiplayer(attrs: XboxAttribute[] | null | undefined): Multiplayer | undefined {
  const list = attrs ?? [];
  const localMax = maxOf(list, [XBOX_PLAYER_ATTRS.localCoop, XBOX_PLAYER_ATTRS.localMulti]);
  const onlineMax = maxOf(list, [XBOX_PLAYER_ATTRS.onlineCoop, XBOX_PLAYER_ATTRS.onlineMulti]);
  const coop = list.some((a) => a.Name === XBOX_PLAYER_ATTRS.localCoop || a.Name === XBOX_PLAYER_ATTRS.onlineCoop);
  if (localMax === undefined && onlineMax === undefined && !coop) return undefined;
  return { localMax, onlineMax, coop: coop || undefined };
}

/**
 * SKU 들의 지원 언어 → 한국어 지원(글자만). 언어 목록이 하나도 없으면 undefined(모른다)다.
 * 음성은 이 응답이 말하지 않으므로 늘 비운다.
 */
export function parseXboxKorean(languageLists: Array<string[] | null | undefined>): KoreanSupport | undefined {
  const all = languageLists.flatMap((l) => l ?? []).map((l) => l.toLowerCase());
  if (all.length === 0) return undefined;
  return { text: all.some((l) => l === XBOX_KOREAN_CODE || l.startsWith(`${XBOX_KOREAN_CODE}-`)) };
}
