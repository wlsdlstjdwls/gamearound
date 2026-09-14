// OpenCritic 어댑터 — 설계서 §4.1/§10 (평점 1순위 소스).
// 2026-09-11: api.opencritic.com 직접 호출은 HTTP 400 "API key is required" — RapidAPI 경유만 가능.
// OPENCRITIC_RAPIDAPI_KEY 가 있으면 RapidAPI 호스트 + x-rapidapi-key 헤더로 호출, 없으면 소스 비활성(adapters/index.ts).
import { z } from "zod";
import { slugify } from "@/lib/slug";
import {
  AdapterError,
  CRAWLER_USER_AGENT,
  type MetaAdapter,
  type MetaSnapshot,
  type SearchCandidate,
} from "./types";

export const OPENCRITIC_RAPIDAPI_KEY_ENV = "OPENCRITIC_RAPIDAPI_KEY";
export const OPENCRITIC_RAPIDAPI_HOST = "opencritic-api.p.rapidapi.com";
export const OPENCRITIC_API_URL = `https://${OPENCRITIC_RAPIDAPI_HOST}/api`;
export const OPENCRITIC_SITE_URL = "https://opencritic.com/game";
const FETCH_TIMEOUT_MS = 15_000;

const gameSchema = z.object({
  id: z.number(),
  name: z.string(),
  topCriticScore: z.number().nullable().optional(),
  percentRecommended: z.number().nullable().optional(),
  tier: z.string().nullable().optional(),
  Genres: z.array(z.object({ name: z.string() })).optional(),
});

const searchSchema = z.array(z.object({ id: z.number(), name: z.string(), dist: z.number().optional() }));

// ---- 순수 파서 ----

/** /game/<id> 응답 → MetaSnapshot. topCriticScore 가 -1/null 이면 점수 없음 */
export function parseOpenCriticGame(raw: unknown): MetaSnapshot {
  const parsed = gameSchema.safeParse(raw);
  if (!parsed.success) throw new AdapterError(`OpenCritic 응답 형식 오류: ${parsed.error.message}`, "opencritic", false);
  const score = parsed.data.topCriticScore;
  const opencritic = score === null || score === undefined || score < 0 ? null : Math.round(score);
  const genres = (parsed.data.Genres ?? []).map((g) => g.name.trim()).filter(Boolean);
  return {
    scores: { opencritic },
    ...(genres.length ? { genres } : {}),
  };
}

/** /game/search 응답 → 후보 */
export function parseOpenCriticSearch(raw: unknown): SearchCandidate[] {
  const parsed = searchSchema.safeParse(raw);
  if (!parsed.success) throw new AdapterError(`OpenCritic 검색 응답 형식 오류: ${parsed.error.message}`, "opencritic", false);
  return parsed.data.map((g) => ({
    externalId: String(g.id),
    title: g.name,
    url: `${OPENCRITIC_SITE_URL}/${g.id}/${slugify(g.name)}`,
  }));
}

// ---- 네트워크 ----

async function fetchJson(url: string): Promise<unknown> {
  let res: Response;
  try {
    const apiKey = process.env[OPENCRITIC_RAPIDAPI_KEY_ENV];
    if (!apiKey) throw new AdapterError(`OpenCritic: ${OPENCRITIC_RAPIDAPI_KEY_ENV} 없음`, "opencritic", false);
    res = await fetch(url, {
      headers: {
        "User-Agent": CRAWLER_USER_AGENT,
        Accept: "application/json",
        "x-rapidapi-key": apiKey,
        "x-rapidapi-host": OPENCRITIC_RAPIDAPI_HOST,
      },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
  } catch (e) {
    if (e instanceof AdapterError) throw e;
    throw new AdapterError(`OpenCritic 요청 실패 (${url}): ${e instanceof Error ? e.message : String(e)}`, "opencritic", true);
  }
  if (res.status === 401 || res.status === 403) throw new AdapterError(`OpenCritic 인증 실패 HTTP ${res.status} (RapidAPI 키 확인)`, "opencritic", false);
  if (res.status === 404) throw new AdapterError(`OpenCritic 게임 없음 (${url})`, "opencritic", false);
  if (res.status === 429 || res.status >= 500) throw new AdapterError(`OpenCritic HTTP ${res.status} (${url})`, "opencritic", true);
  if (!res.ok) throw new AdapterError(`OpenCritic HTTP ${res.status} (${url})`, "opencritic", false);
  try {
    return await res.json();
  } catch (e) {
    throw new AdapterError(`OpenCritic JSON 파싱 실패: ${e instanceof Error ? e.message : String(e)}`, "opencritic", true);
  }
}

export const opencriticAdapter: MetaAdapter = {
  source: "opencritic",
  minIntervalMs: 2000,

  async search(query: string): Promise<SearchCandidate[]> {
    const u = new URL(`${OPENCRITIC_API_URL}/game/search`);
    u.searchParams.set("criteria", query);
    return parseOpenCriticSearch(await fetchJson(u.toString()));
  },

  async fetch(id: string): Promise<MetaSnapshot> {
    return parseOpenCriticGame(await fetchJson(`${OPENCRITIC_API_URL}/game/${encodeURIComponent(id)}`));
  },
};
