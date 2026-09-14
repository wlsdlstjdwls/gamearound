// HowLongToBeat 어댑터 — 설계서 §4.1. 게임 페이지 HTML을 cheerio 로 파싱해 플레이타임 추출.
// 검색은 2단계다(2026-09-12 재구현): GET /api/search/site/init 로 1회용 토큰을 받고,
// POST /api/search/site 에 헤더 3종(x-auth-token/x-hp-key/x-hp-val)과 본문 hpKey 필드를 함께 보낸다.
// 토큰은 재사용 가능하며 만료 시 403 이 오므로 그때 한 번만 재발급해 재시도한다(사이트 프런트엔드와 동일).
import { load } from "cheerio";
import { z } from "zod";
import {
  AdapterError,
  CRAWLER_USER_AGENT,
  type MetaAdapter,
  type MetaSnapshot,
  type SearchCandidate,
} from "./types";

export const HLTB_BASE_URL = "https://howlongtobeat.com";
export const HLTB_GAME_URL = `${HLTB_BASE_URL}/game`;
export const HLTB_SEARCH_URL = `${HLTB_BASE_URL}/api/search/site`;
export const HLTB_SEARCH_INIT_URL = `${HLTB_SEARCH_URL}/init`;
const FETCH_TIMEOUT_MS = 15_000;

// ---- 셀렉터 상수: 사이트 마크업 변경 시 여기만 수정 ----
export const HLTB_SELECTORS = {
  /** Next.js 데이터 스크립트 (1순위: 초 단위 정확한 값) */
  nextData: "script#__NEXT_DATA__",
  /** 페이지 상단 시간 박스 목록 (2순위: 텍스트 파싱) */
  timeList: 'div[class*="GameStats_game_times"] li',
  timeLabel: "h4",
  timeValue: "h5",
} as const;

/** 시간 박스 라벨 → 필드 매핑 (소문자 비교) */
export const HLTB_LABELS: Record<"main" | "extra" | "completionist", string[]> = {
  main: ["main story", "single-player"],
  extra: ["main + extra", "main + sides"],
  completionist: ["completionist"],
};

// __NEXT_DATA__ 내부 구조: props.pageProps.game.data.game[0].{comp_main,comp_plus,comp_100} (초 단위)
const nextDataSchema = z.object({
  props: z.object({
    pageProps: z.object({
      game: z.object({
        data: z.object({
          game: z.array(
            z.object({
              game_id: z.number().optional(),
              game_name: z.string().optional(),
              comp_main: z.number().optional(),
              comp_plus: z.number().optional(),
              comp_100: z.number().optional(),
            }),
          ),
        }),
      }),
    }),
  }),
});

const searchResponseSchema = z.object({
  data: z.array(z.object({ game_id: z.number(), game_name: z.string() })).default([]),
});

/** /api/search/site/init 응답 — 검색 1건에 필요한 토큰 3종 */
const searchTokenSchema = z.object({
  token: z.string().min(1),
  hpKey: z.string().min(1),
  hpVal: z.string().min(1),
});
export type HltbSearchToken = z.infer<typeof searchTokenSchema>;

// ---- 순수 파서 ----

/** 초 → 시간(소수 1자리). 0 이하면 null (HLTB 는 데이터 없음을 0으로 표시) */
export function secondsToHours(sec: number | undefined): number | null {
  if (sec === undefined || !Number.isFinite(sec) || sec <= 0) return null;
  return Math.round((sec / 3600) * 10) / 10;
}

/** "11½ Hours", "12 Hours", "45 Mins", "--" 같은 텍스트 → 시간. 파싱 불가 시 null */
export function parseHoursText(text: string): number | null {
  const t = text.replace(/\s+/g, " ").trim().toLowerCase();
  if (!t || t === "--" || t === "-") return null;
  const m = t.match(/^(\d+)?\s*(½)?\s*(hours?|hrs?|mins?|minutes?)/);
  if (!m) return null;
  const whole = m[1] ? Number(m[1]) : 0;
  const half = m[2] ? 0.5 : 0;
  const n = whole + half;
  if (n <= 0) return null;
  if (m[3].startsWith("min")) return Math.round((n / 60) * 10) / 10;
  return n;
}

function emptyPlaytime(): NonNullable<MetaSnapshot["playtime"]> {
  return { main: null, extra: null, completionist: null };
}

/** 게임 페이지 HTML → MetaSnapshot(playtime). __NEXT_DATA__ 우선, 없으면 시간 박스 텍스트 파싱 */
export function parseHltbGamePage(html: string): MetaSnapshot {
  const $ = load(html);

  // 1순위: __NEXT_DATA__.
  // 값이 전부 0 이어도 "제보가 아직 없는 게임"일 뿐이므로 정상 응답(전부 null)으로 돌려준다.
  // 여기서 에러를 던지면 그런 게임이 매 배치마다 재시도되고 sync_logs 가 partial 로 남는다(2026-09-13 hltb 9건).
  const nextRaw = $(HLTB_SELECTORS.nextData).first().text();
  if (nextRaw) {
    try {
      const parsed = nextDataSchema.safeParse(JSON.parse(nextRaw));
      const g = parsed.success ? parsed.data.props.pageProps.game.data.game[0] : undefined;
      if (g) {
        return {
          playtime: {
            main: secondsToHours(g.comp_main),
            extra: secondsToHours(g.comp_plus),
            completionist: secondsToHours(g.comp_100),
          },
        };
      }
    } catch {
      // JSON 깨짐 → 셀렉터 파싱으로 폴백
    }
  }

  // 2순위: 시간 박스
  const playtime = emptyPlaytime();
  let found = false;
  $(HLTB_SELECTORS.timeList).each((_, li) => {
    const label = $(li).find(HLTB_SELECTORS.timeLabel).first().text().trim().toLowerCase();
    const value = parseHoursText($(li).find(HLTB_SELECTORS.timeValue).first().text());
    for (const key of ["main", "extra", "completionist"] as const) {
      if (HLTB_LABELS[key].some((l) => label.startsWith(l)) && playtime[key] === null) {
        playtime[key] = value;
        found = true;
      }
    }
  });
  if (!found) throw new AdapterError("HLTB 페이지에서 플레이타임을 찾지 못함 (마크업 변경 가능성)", "hltb", false);
  return { playtime };
}

/** /api/search/site 응답 → 후보 */
export function parseHltbSearch(raw: unknown): SearchCandidate[] {
  const parsed = searchResponseSchema.safeParse(raw);
  if (!parsed.success) return [];
  return parsed.data.data.map((g) => ({
    externalId: String(g.game_id),
    title: g.game_name,
    url: `${HLTB_GAME_URL}/${g.game_id}`,
  }));
}

// ---- 네트워크 ----

// 게임 페이지는 크롤러 UA 로도 200 이지만, 검색 init 은 봇 UA 에 403 을 준다(2026-09-12 확인).
// init 토큰 안에 UA 문자열이 그대로 들어가므로 init 과 search 는 반드시 같은 UA 여야 한다.
export const HLTB_SEARCH_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

const COMMON_HEADERS = {
  "User-Agent": CRAWLER_USER_AGENT,
  Referer: `${HLTB_BASE_URL}/`,
  Origin: HLTB_BASE_URL,
};

const SEARCH_HEADERS = { ...COMMON_HEADERS, "User-Agent": HLTB_SEARCH_USER_AGENT };

/** 검색 본문. hpKey 필드에 hpVal 을 넣는 것까지가 서버 검증 대상이다(프런트엔드와 동일). */
export function buildHltbSearchBody(query: string, token: HltbSearchToken): Record<string, unknown> {
  const emptyFilter = { mode: "include", values: [] as string[] };
  return {
    searchType: "games",
    searchTerms: query.trim().split(/\s+/).filter(Boolean),
    searchPage: 1,
    size: 20,
    searchOptions: {
      games: {
        userId: 0,
        platform: emptyFilter,
        sortCategory: "popular",
        rangeCategory: "main",
        rangeTime: { min: null, max: null },
        gameplay: { perspective: emptyFilter, flow: emptyFilter, genre: emptyFilter, difficulty: "" },
        year: emptyFilter,
        modifier: "",
      },
      users: { sortCategory: "postcount" },
      lists: { sortCategory: "follows" },
      filter: "",
      sort: 0,
      randomizer: 0,
    },
    useCache: true,
    [token.hpKey]: token.hpVal,
  };
}

/** 토큰은 여러 검색에 재사용 가능. 403 일 때만 재발급한다. */
let cachedSearchToken: HltbSearchToken | null = null;

/** 테스트용 — 모듈 캐시 초기화 */
export function resetHltbSearchToken(): void {
  cachedSearchToken = null;
}

async function fetchSearchToken(): Promise<HltbSearchToken> {
  let res: Response;
  try {
    res = await fetch(`${HLTB_SEARCH_INIT_URL}?t=${Date.now()}`, {
      headers: { ...SEARCH_HEADERS, Accept: "application/json" },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
  } catch (e) {
    throw new AdapterError(`HLTB 검색 토큰 요청 실패: ${e instanceof Error ? e.message : String(e)}`, "hltb", true);
  }
  if (!res.ok) throw new AdapterError(`HLTB 검색 토큰 HTTP ${res.status}`, "hltb", res.status === 429 || res.status >= 500);
  const parsed = searchTokenSchema.safeParse(await res.json());
  if (!parsed.success) throw new AdapterError("HLTB 검색 토큰 응답 형식 변경", "hltb", false);
  cachedSearchToken = parsed.data;
  return parsed.data;
}

async function postSearch(query: string, token: HltbSearchToken): Promise<Response> {
  try {
    return await fetch(HLTB_SEARCH_URL, {
      method: "POST",
      headers: {
        ...SEARCH_HEADERS,
        "Content-Type": "application/json",
        Accept: "application/json",
        "x-auth-token": token.token,
        "x-hp-key": token.hpKey,
        "x-hp-val": token.hpVal,
      },
      body: JSON.stringify(buildHltbSearchBody(query, token)),
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
  } catch (e) {
    throw new AdapterError(`HLTB 검색 요청 실패: ${e instanceof Error ? e.message : String(e)}`, "hltb", true);
  }
}

export const hltbAdapter: MetaAdapter = {
  source: "hltb",
  minIntervalMs: 4000,

  /** init 토큰 → 검색. 토큰 만료(403)면 1회 재발급 후 재시도 */
  async search(query: string): Promise<SearchCandidate[]> {
    let token = cachedSearchToken ?? (await fetchSearchToken());
    let res = await postSearch(query, token);
    if (res.status === 403) {
      cachedSearchToken = null;
      token = await fetchSearchToken();
      res = await postSearch(query, token);
    }
    if (!res.ok) throw new AdapterError(`HLTB 검색 HTTP ${res.status}`, "hltb", res.status === 429 || res.status >= 500);
    return parseHltbSearch(await res.json());
  },

  async fetch(gameId: string): Promise<MetaSnapshot> {
    let res: Response;
    try {
      res = await fetch(`${HLTB_GAME_URL}/${encodeURIComponent(gameId)}`, {
        headers: { ...COMMON_HEADERS, Accept: "text/html" },
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      });
    } catch (e) {
      throw new AdapterError(`HLTB 요청 실패 (id=${gameId}): ${e instanceof Error ? e.message : String(e)}`, "hltb", true);
    }
    if (res.status === 404) throw new AdapterError(`HLTB 게임 없음 (id=${gameId})`, "hltb", false);
    if (res.status === 429 || res.status === 403 || res.status >= 500) throw new AdapterError(`HLTB HTTP ${res.status} (id=${gameId})`, "hltb", true);
    if (!res.ok) throw new AdapterError(`HLTB HTTP ${res.status} (id=${gameId})`, "hltb", false);
    return parseHltbGamePage(await res.text());
  },
};
