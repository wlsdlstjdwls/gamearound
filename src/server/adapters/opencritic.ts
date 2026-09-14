// OpenCritic 어댑터 — 설계서 §4.1/§10 (평점 1순위 소스).
// 2026-09-11: api.opencritic.com 직접 호출은 HTTP 400 "API key is required" — RapidAPI 경유만 가능.
// OPENCRITIC_RAPIDAPI_KEY 가 있으면 RapidAPI 호스트 + x-rapidapi-key 헤더로 호출, 없으면 소스 비활성(adapters/index.ts).
import { z } from "zod";
import { slugify } from "@/lib/slug";
import {
  AdapterError,
  type MetaAdapter,
  type MetaSnapshot,
  type SearchCandidate,
} from "./types";
import { createHttpClient } from "./http";

export const OPENCRITIC_RAPIDAPI_KEY_ENV = "OPENCRITIC_RAPIDAPI_KEY";
export const OPENCRITIC_RAPIDAPI_HOST = "opencritic-api.p.rapidapi.com";
export const OPENCRITIC_API_URL = `https://${OPENCRITIC_RAPIDAPI_HOST}/api`;
export const OPENCRITIC_SITE_URL = "https://opencritic.com/game";

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

// RapidAPI 키는 요청 시점에 읽는다 — 모듈 로드 순서(dotenv)보다 늦게 들어오는 환경이 있다.
const http = createHttpClient({
  source: "opencritic",
  label: "OpenCritic",
  headers: () => {
    const apiKey = process.env[OPENCRITIC_RAPIDAPI_KEY_ENV];
    if (!apiKey) throw new AdapterError(`OpenCritic: ${OPENCRITIC_RAPIDAPI_KEY_ENV} 없음`, "opencritic", false);
    return { "x-rapidapi-key": apiKey, "x-rapidapi-host": OPENCRITIC_RAPIDAPI_HOST };
  },
  onStatus: (status, ctx) => {
    // 401·403 은 키 문제라 재시도해도 같다 — 관리자가 키를 넣어야 풀린다
    if (status === 401 || status === 403)
      return new AdapterError(`OpenCritic 인증 실패 HTTP ${status} (RapidAPI 키 확인)`, "opencritic", false);
    if (status === 404) return new AdapterError(`OpenCritic 게임 없음 (${ctx})`, "opencritic", false);
    return undefined;
  },
});

export const opencriticAdapter: MetaAdapter = {
  source: "opencritic",
  minIntervalMs: 2000,

  async search(query: string): Promise<SearchCandidate[]> {
    const u = new URL(`${OPENCRITIC_API_URL}/game/search`);
    u.searchParams.set("criteria", query);
    return parseOpenCriticSearch(await http.json(u.toString()));
  },

  async fetch(id: string): Promise<MetaSnapshot> {
    return parseOpenCriticGame(await http.json(`${OPENCRITIC_API_URL}/game/${encodeURIComponent(id)}`));
  },
};
