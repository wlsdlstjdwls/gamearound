// Metacritic 어댑터 — 설계서 §4.1/§10 (평점 2순위). 사이트 프론트엔드가 쓰는 backend.metacritic.com JSON 을 그대로 사용.
//   검색: /finder/metacritic/search/<q>/web?mcoTypeId=13  |  단건: /composer/metacritic/pages/games/<slug>/web
//   apiKey 는 사이트 HTML 에 공개된 프론트엔드 키(비밀 아님). 키가 바뀌면 이 파일 상수만 갱신(§10). 차단 시 §11-5: OpenCritic 만 표기.
// PoC(2026-09-11): elden-ring / baldurs-gate-3 / hades / hollow-knight-silksong 4건 점수 확인.
import { z } from "zod";
import { AdapterError, CRAWLER_USER_AGENT, type MetaAdapter, type MetaSnapshot, type SearchCandidate } from "./types";

export const METACRITIC_BACKEND_URL = "https://backend.metacritic.com";
export const METACRITIC_SITE_URL = "https://www.metacritic.com/game";
/** 사이트 HTML 에 노출된 프론트엔드 apiKey */
export const METACRITIC_API_KEY = "1MOZgmNFxvmljaQR1X9KAij9Mo4xAY3u";
/** finder 의 mcoTypeId: 13 = game-title */
const GAME_TYPE_ID = 13;
const SEARCH_LIMIT = 10;
const FETCH_TIMEOUT_MS = 15_000;

// ---- 응답 스키마 ----
const scoreSummarySchema = z.object({ score: z.number().nullable().optional(), reviewCount: z.number().nullable().optional() });

const searchSchema = z.object({
  data: z.object({
    items: z
      .array(
        z.object({
          typeId: z.number().optional(),
          title: z.string(),
          slug: z.string(),
          criticScoreSummary: scoreSummarySchema.nullable().optional(),
        }),
      )
      .default([]),
  }),
});

const composerSchema = z.object({
  components: z
    .array(
      z.object({
        meta: z.object({ componentName: z.string().optional() }).optional(),
        data: z
          .object({
            item: z
              .object({
                title: z.string().optional(),
                slug: z.string().optional(),
                criticScoreSummary: scoreSummarySchema.nullable().optional(),
                genres: z.array(z.object({ name: z.string().nullable().optional() })).nullable().optional(),
              })
              .nullable()
              .optional(),
          })
          .nullable()
          .optional(),
      }),
    )
    .default([]),
});

// ---- 순수 파서 ----

export function metacriticGameUrl(slug: string): string {
  return `${METACRITIC_SITE_URL}/${slug}/`;
}

/** composer 응답 → MetaSnapshot. product 컴포넌트가 없으면 게임 없음(404 대신 200 으로 옴). 점수 0/null 은 "점수 없음(tbd)" */
export function parseMetacriticGame(raw: unknown, slug: string): MetaSnapshot {
  const parsed = composerSchema.safeParse(raw);
  if (!parsed.success) throw new AdapterError(`Metacritic 응답 형식 오류: ${parsed.error.message}`, "metacritic", false);
  const item = parsed.data.components.find((c) => c.meta?.componentName === "product")?.data?.item;
  if (!item) throw new AdapterError(`Metacritic 게임 없음: ${slug}`, "metacritic", false);
  const score = item.criticScoreSummary?.score;
  const metacritic = typeof score === "number" && score > 0 ? Math.round(score) : null;
  const genres = (item.genres ?? []).map((g) => g.name?.trim() ?? "").filter(Boolean);
  return { scores: { metacritic }, ...(genres.length ? { genres } : {}) };
}

/** finder 응답 → 후보 (typeId 13 = 게임만). externalId = slug */
export function parseMetacriticSearch(raw: unknown): SearchCandidate[] {
  const parsed = searchSchema.safeParse(raw);
  if (!parsed.success) throw new AdapterError(`Metacritic 검색 응답 형식 오류: ${parsed.error.message}`, "metacritic", false);
  return parsed.data.data.items
    .filter((i) => i.typeId === undefined || i.typeId === GAME_TYPE_ID)
    .map((i) => ({ externalId: i.slug, title: i.title.trim(), url: metacriticGameUrl(i.slug) }));
}

// ---- 네트워크 ----

async function fetchJson(url: string): Promise<unknown> {
  let res: Response;
  try {
    res = await fetch(url, {
      headers: { "User-Agent": CRAWLER_USER_AGENT, Accept: "application/json" },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
  } catch (e) {
    throw new AdapterError(`Metacritic 요청 실패 (${url}): ${e instanceof Error ? e.message : String(e)}`, "metacritic", true);
  }
  if (res.status === 404) throw new AdapterError(`Metacritic 게임 없음 (${url})`, "metacritic", false);
  if (res.status === 429 || res.status >= 500) throw new AdapterError(`Metacritic HTTP ${res.status} (${url})`, "metacritic", true);
  if (!res.ok) throw new AdapterError(`Metacritic HTTP ${res.status} (${url})`, "metacritic", false);
  try {
    return await res.json();
  } catch (e) {
    throw new AdapterError(`Metacritic JSON 파싱 실패: ${e instanceof Error ? e.message : String(e)}`, "metacritic", true);
  }
}

export const metacriticAdapter: MetaAdapter = {
  source: "metacritic",
  minIntervalMs: 3000,

  async search(query: string): Promise<SearchCandidate[]> {
    const u = new URL(`${METACRITIC_BACKEND_URL}/finder/metacritic/search/${encodeURIComponent(query)}/web`);
    u.searchParams.set("apiKey", METACRITIC_API_KEY);
    u.searchParams.set("mcoTypeId", String(GAME_TYPE_ID));
    u.searchParams.set("limit", String(SEARCH_LIMIT));
    return parseMetacriticSearch(await fetchJson(u.toString()));
  },

  async fetch(slug: string): Promise<MetaSnapshot> {
    if (!/^[a-z0-9-]+$/.test(slug)) throw new AdapterError(`Metacritic slug 형식 오류: ${slug}`, "metacritic", false);
    const u = new URL(`${METACRITIC_BACKEND_URL}/composer/metacritic/pages/games/${slug}/web`);
    u.searchParams.set("apiKey", METACRITIC_API_KEY);
    return parseMetacriticGame(await fetchJson(u.toString()), slug);
  },
};
