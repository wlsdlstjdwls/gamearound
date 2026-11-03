// 번역 어댑터 — 글 묶음을 DeepL 로 한국어로 옮겨 돌려주기만 한다. DB 는 건드리지 않는다(규약 §1, 저장은 sync/news-digest).
// 키가 없거나 한도를 다 썼으면 던지지 않고 null 을 돌려준다. 번역은 덤이다 — 번역이 안 됐다고 묶음이 안 가면 안 된다.
import { createHttpClient } from "../http";
import { AdapterError } from "../types";
import { errorMessage } from "@/lib/errors";
import {
  DEEPL_API_KEY_ENV,
  DEEPL_FREE_KEY_SUFFIX,
  DEEPL_FREE_URL,
  DEEPL_MAX_TEXTS,
  DEEPL_PRO_URL,
  DEEPL_QUOTA_EXCEEDED,
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
class DeeplQuotaError extends AdapterError {}

// 소스 이름은 뉴스 축(rss)을 빌린다 — 번역은 수집 소스가 아니라 Source 갈래에 따로 둘 자리가 없다(adapters/igdb 가 wikidata 를 빌린 것과 같다)
const http = createHttpClient({
  source: "rss",
  label: "DeepL",
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
