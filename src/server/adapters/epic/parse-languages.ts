// 콘텐츠 API 의 requirements.languages → 한국어 지원.
//
// 사양과 같은 응답에 들어 있다(fetchRequirements 가 이미 받는다). 화면과 자막은 TEXT 하나로 묶여 온다 —
// 에픽이 가르지 않으니 우리도 text 하나로만 담는다.
import type { KoreanSupport } from "../types";
import { EPIC_KOREAN_LABEL, EPIC_KOREAN_NAMES, EPIC_LANGUAGE_AUDIO, EPIC_LANGUAGE_TEXT } from "./constants";

/** "AUDIO: English | TEXT: English, Korean" 같은 줄에서 머리말 하나 뒤의 언어 목록. 머리말이 없으면 null */
function section(joined: string, label: string): string[] | null {
  const m = joined.match(new RegExp(`${label}\\s*:\\s*([^|]*)`, "i"));
  if (!m) return null;
  // 목록 끝에 마침표가 붙어 온다("..., Portuguese - Brazil.", 2026-10-06 실측 Spider-Man 2). 떼지 않으면 끝에 선 한국어를 놓친다
  return m[1].split(",").map((s) => s.trim().replace(/\.+$/, "").trim()).filter(Boolean);
}

/**
 * 언어 줄 목록 → 한국어 지원. 머리말이 하나도 없으면 undefined(모른다) 다 —
 * 머리말 없이 언어만 적은 게임은 그게 음성인지 글자인지 알 수 없어서 짐작하지 않는다.
 */
export function parseEpicKorean(lines: unknown): KoreanSupport | undefined {
  if (!Array.isArray(lines)) return undefined;
  const joined = lines.filter((l): l is string => typeof l === "string").join(" | ");
  const audio = section(joined, EPIC_LANGUAGE_AUDIO);
  const text = section(joined, EPIC_LANGUAGE_TEXT);
  if (!audio && !text) return undefined;
  const hasKorean = (list: string[] | null) => (list ? list.some((l) => l.toLowerCase() === EPIC_KOREAN_LABEL.toLowerCase()) : undefined);
  return { text: hasKorean(text), voice: hasKorean(audio) };
}

/**
 * 콘텐츠 응답 전체 → 한국어 지원. 언어 줄은 여러 페이지에 같은 값으로 반복된다(home, 번들 페이지).
 * 처음 만난 줄을 쓴다 — 사양을 고를 때(parseEpicRequirements)와 같은 규칙이다.
 */
export function parseEpicContentKorean(data: unknown): KoreanSupport | undefined {
  const pages = (data as { pages?: unknown })?.pages;
  if (!Array.isArray(pages)) return undefined;
  for (const page of pages) {
    const lines = (page as { data?: { requirements?: { languages?: unknown } } })?.data?.requirements?.languages;
    const korean = parseEpicKorean(lines);
    if (korean) return korean;
  }
  return undefined;
}

type ConfigEntry = { configs?: { supportedAudio?: unknown; supportedText?: unknown } } | null;

/**
 * 스토어 설정 응답(EPIC_CONFIG_QUERY) → 한국어 지원. configuration 은 배열이고 빈 객체가 섞여 온다 — 값이 있는 첫 칸을 쓴다.
 * 목록이 비었거나 없으면 그 칸은 모름(undefined)이다.
 */
export function parseEpicConfigKorean(data: unknown): KoreanSupport | undefined {
  const entries = (data as { data?: { Product?: { sandbox?: { configuration?: ConfigEntry[] } } } })?.data?.Product?.sandbox?.configuration;
  if (!Array.isArray(entries)) return undefined;
  const configs = entries.find((e) => e?.configs)?.configs;
  if (!configs) return undefined;
  const has = (list: unknown) =>
    Array.isArray(list) && list.length > 0 ? list.some((l) => typeof l === "string" && (EPIC_KOREAN_NAMES as readonly string[]).includes(l.trim().toLowerCase())) : undefined;
  const text = has(configs.supportedText);
  const voice = has(configs.supportedAudio);
  if (text === undefined && voice === undefined) return undefined;
  return { text, voice };
}
