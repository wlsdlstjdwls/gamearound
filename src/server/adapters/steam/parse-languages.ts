// 스팀 지원 언어 → 한국어 지원.
//
// 두 경로가 있다. 가격 수집(GetItems 배치)은 언어마다 칸을 나눠 주고(steamItemKorean),
// 단건 경로(appdetails)는 언어 이름을 한 줄에 늘어놓고 음성에만 별표를 단다(parseSteamKorean).
// 배치 쪽이 주 경로다 — 요청을 늘리지 않고 수집이 도는 대로 채워진다.
import type { KoreanSupport } from "../types";
import { STEAM_ELANGUAGE_KOREAN, STEAM_KOREAN_LABELS, STEAM_VOICE_MARK } from "./constants";
import type { SteamAppData, StoreItem } from "./schemas";

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

/**
 * GetItems 의 supported_languages → 한국어 지원. 목록이 없거나 비면 undefined(모른다)다.
 * 목록이 있는데 한국어 줄이 없으면 둘 다 false 다 — 스팀이 언어를 다 적어 주면서 한국어를 빼놓은 것이다.
 * "글자" 는 화면이나 자막 중 하나라도 한국어라는 뜻이다(supported 가 화면, subtitles 가 자막).
 */
export function steamItemKorean(languages: StoreItem["supported_languages"]): KoreanSupport | undefined {
  if (!languages || languages.length === 0) return undefined;
  const ko = languages.find((l) => l.elanguage === STEAM_ELANGUAGE_KOREAN);
  if (!ko) return { text: false, voice: false };
  return { text: ko.supported === true || ko.subtitles === true, voice: ko.full_audio === true };
}
