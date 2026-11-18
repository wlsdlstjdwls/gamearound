// 번역 어댑터 — 글 묶음을 DeepL 로 한국어로 옮겨 돌려주기만 한다. DB 는 건드리지 않는다(규약 §1, 저장은 sync/news-digest).
// 키가 없거나 한도를 다 썼으면 던지지 않고 null 을 돌려준다. 번역은 덤이다 — 번역이 안 됐다고 묶음이 안 가면 안 된다.
import { createHttpClient } from "../http";
import { AdapterError } from "../types";
import { errorMessage } from "@/lib/errors";
import {
  DEEPL_API_KEY_ENV,
  DEEPL_FREE_KEY_SUFFIX,
  DEEPL_FREE_URL,
  DEEPL_FREE_USAGE_URL,
  DEEPL_LONG_TIMEOUT_MS,
  DEEPL_MAX_TEXTS,
  DEEPL_PRO_URL,
  DEEPL_PRO_USAGE_URL,
  DEEPL_QUOTA_EXCEEDED,
  DEEPL_REQUEST_MAX_CHARS,
  DEEPL_TARGET_LANG,
} from "./constants";

function apiKey(): string | undefined {
  return process.env[DEEPL_API_KEY_ENV]?.trim() || undefined;
}

export function translationConfigured(): boolean {
  return Boolean(apiKey());
}

export function deeplUrl(key: string): string {
  return key.endsWith(DEEPL_FREE_KEY_SUFFIX) ? DEEPL_FREE_URL : DEEPL_PRO_URL;
}

/** 이번 달 한도를 다 썼다. 남은 묶음도 같은 답이라 거기서 멈춘다 */
export class DeeplQuotaError extends AdapterError {}

// 소스 이름은 뉴스 축(rss)을 빌린다 — 번역은 수집 소스가 아니라 Source 갈래에 따로 둘 자리가 없다(adapters/igdb 가 wikidata 를 빌린 것과 같다)
const http = createHttpClient({
  source: "rss",
  label: "DeepL",
  onStatus: (status, ctx) => (status === DEEPL_QUOTA_EXCEEDED ? new DeeplQuotaError(`DeepL 이번 달 무료 한도를 다 썼어요 (${ctx})`, "rss", false) : undefined),
});

/** 본문처럼 긴 글용. 기다림만 길고 한도 판정은 위와 같다 */
const httpLong = createHttpClient({
  source: "rss",
  label: "DeepL",
  timeoutMs: DEEPL_LONG_TIMEOUT_MS,
  onStatus: (status, ctx) => (status === DEEPL_QUOTA_EXCEEDED ? new DeeplQuotaError(`DeepL 이번 달 무료 한도를 다 썼어요 (${ctx})`, "rss", false) : undefined),
});

type DeeplResponse = { translations?: Array<{ text?: string }> };

/**
 * texts 를 한국어로. 돌려주는 배열은 texts 와 같은 길이, 같은 순서다. 못 옮긴 자리는 null.
 * 키가 없으면 전부 null(요청하지 않는다). 한 묶음이 실패하면 그 묶음만 null 이고 다음 묶음은 계속 간다 — 단, 한도 초과면 거기서 멈춘다.
 */
export async function translateToKorean(texts: readonly string[]): Promise<Array<string | null>> {
  const out: Array<string | null> = texts.map(() => null);
  const key = apiKey();
  if (!key || texts.length === 0) return out;
  for (let i = 0; i < texts.length; i += DEEPL_MAX_TEXTS) {
    const part = texts.slice(i, i + DEEPL_MAX_TEXTS);
    try {
      const res = (await http.json(deeplUrl(key), {
        method: "POST",
        headers: { Authorization: `DeepL-Auth-Key ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify({ text: part, target_lang: DEEPL_TARGET_LANG }),
        context: `${part.length}건`,
      })) as DeeplResponse;
      res.translations?.forEach((t, j) => {
        const text = t.text?.trim();
        if (text) out[i + j] = text;
      });
    } catch (e) {
      console.warn(`[translate] ${errorMessage(e)}`);
      if (e instanceof DeeplQuotaError) break;
    }
  }
  return out;
}

/**
 * 한 글(패치 본문 하나)의 조각들을 한국어로. 하나라도 못 옮기면 **던진다** — 반쪽 번역을 저장하지 않으려는 것이다.
 * translateToKorean 과 달리 실패를 삼키지 않는 이유: 호출부(sync/patch-translate)가 실패 횟수를 세고, 한도(456)면 회차를 멈춰야 한다.
 * 한도 초과는 DeeplQuotaError 로 던진다. 키가 없으면 Error 다(호출부가 회차 전에 translationConfigured 로 거른다).
 */
export async function translateChunksStrict(texts: readonly string[]): Promise<string[]> {
  const key = apiKey();
  if (!key) throw new Error("DEEPL_API_KEY 가 없어요");
  const out: string[] = [];
  let i = 0;
  while (i < texts.length) {
    // 한 요청 몫: 글 수(50)와 글자 합(30,000) 둘 다 넘지 않게. 조각 하나는 늘 DEEPL_CHUNK_MAX_CHARS 이하라 적어도 하나는 실린다
    const part: string[] = [];
    let size = 0;
    while (i < texts.length && part.length < DEEPL_MAX_TEXTS && (part.length === 0 || size + texts[i].length <= DEEPL_REQUEST_MAX_CHARS)) {
      size += texts[i].length;
      part.push(texts[i]);
      i++;
    }
    const res = (await httpLong.json(deeplUrl(key), {
      method: "POST",
      headers: { Authorization: `DeepL-Auth-Key ${key}`, "Content-Type": "application/json" },
      // preserve_formatting: 줄머리 "- ", "## " 와 줄바꿈을 손대지 않게 한다(목록, 제목 줄이 화면 꼴이다)
      body: JSON.stringify({ text: part, target_lang: DEEPL_TARGET_LANG, preserve_formatting: true }),
      context: `patch ${part.length}조각 ${size}자`,
    })) as DeeplResponse;
    const got = res.translations ?? [];
    if (got.length !== part.length) throw new Error(`DeepL 응답 조각 수가 달라요 (${got.length}/${part.length})`);
    for (const t of got) {
      if (typeof t.text !== "string") throw new Error("DeepL 응답에 글이 없어요");
      out.push(t.text);
    }
  }
  return out;
}

export interface DeeplUsage {
  /** 이번 청구 주기에 쓴 글자 수(뉴스 제목 번역, 패치 번역 합) */
  used: number;
  limit: number;
}

/** 이번 달 사용량. 키가 없거나 못 읽으면 null — 호출부는 우리 DB 합계만으로 예산을 본다 */
export async function getDeeplUsage(): Promise<DeeplUsage | null> {
  const key = apiKey();
  if (!key) return null;
  try {
    const url = key.endsWith(DEEPL_FREE_KEY_SUFFIX) ? DEEPL_FREE_USAGE_URL : DEEPL_PRO_USAGE_URL;
    const res = (await http.json(url, { headers: { Authorization: `DeepL-Auth-Key ${key}` }, context: "usage" })) as {
      character_count?: unknown;
      character_limit?: unknown;
    };
    if (typeof res.character_count !== "number" || typeof res.character_limit !== "number") return null;
    return { used: res.character_count, limit: res.character_limit };
  } catch (e) {
    console.warn(`[translate] 사용량 읽기 실패: ${errorMessage(e)}`);
    return null;
  }
}
