// appdetails 의 supported_languages → 한국어 지원.
//
// 화면과 자막을 가르지 않는 이유: 스팀 appdetails 는 한 줄에 언어만 나열하고 음성에만 별표를 단다.
// 세 갈래(화면, 자막, 음성)는 GetItems 의 include_supported_languages 가 준다고 알려져 있지만,
// 2026-10-06 에 그 응답을 직접 보지 못했다(작업 회선에서 스팀이 끊긴다). 확인 못 한 값은 쓰지 않는다.
import type { KoreanSupport } from "../types";
import { STEAM_KOREAN_LABELS, STEAM_VOICE_MARK } from "./constants";
import type { SteamAppData } from "./schemas";

/**
 * "영어<strong>*</strong>, 한국어, ...<br><strong>*</strong>음성이 지원되는 언어" → 한국어 지원.
 * 문자열이 없으면 undefined 다(모른다). 문자열이 있는데 한국어가 없으면 둘 다 false 다(지원 안 한다).
 */
export function parseSteamKorean(raw: string | null | undefined): KoreanSupport | undefined {
  if (!raw?.trim()) return undefined;
  // <br> 뒤는 별표의 뜻을 적은 각주다. 그 안의 낱말을 언어로 읽지 않게 잘라 낸다
  const list = raw.split(/<br\s*\/?>/i)[0];
  const entries = list.split(",").map((e) => e.trim());
  const korean = entries.find((e) => STEAM_KOREAN_LABELS.some((label) => e.replace(STEAM_VOICE_MARK, "").trim() === label));
  if (!korean) return { text: false, voice: false };
  return { text: true, voice: korean.includes(STEAM_VOICE_MARK) };
}

/** 이미 검증한 appdetails 데이터에서 한국어 지원을 꺼낸다 */
export function steamKoreanOf(data: Pick<SteamAppData, "supported_languages"> | null): KoreanSupport | undefined {
  return parseSteamKorean(data?.supported_languages);
}
