// HowLongToBeat 어댑터 — 설계서 §4.1. 게임 페이지 HTML을 cheerio 로 파싱해 플레이타임 추출.
// 검색 API(/api/search)는 토큰이 자주 바뀌어 불안정하므로 실패 시 빈 배열(§10: 해당 소스만 실패 처리).
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
export const HLTB_SEARCH_URL = `${HLTB_BASE_URL}/api/search`;
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

  // 1순위: __NEXT_DATA__
  const nextRaw = $(HLTB_SELECTORS.nextData).first().text();
  if (nextRaw) {
    try {
      const parsed = nextDataSchema.safeParse(JSON.parse(nextRaw));
      const g = parsed.success ? parsed.data.props.pageProps.game.data.game[0] : undefined;
      if (g) {
        const playtime = {
          main: secondsToHours(g.comp_main),
          extra: secondsToHours(g.comp_plus),
          completionist: secondsToHours(g.comp_100),
        };
        if (playtime.main !== null || playtime.extra !== null || playtime.completionist !== null) return { playtime };
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

/** /api/search 응답 → 후보 */
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

const COMMON_HEADERS = {
  "User-Agent": CRAWLER_USER_AGENT,
  Referer: `${HLTB_BASE_URL}/`,
  Origin: HLTB_BASE_URL,
};

export const hltbAdapter: MetaAdapter = {
  source: "hltb",
  minIntervalMs: 4000,

  /** 검색 API 는 토큰/경로가 자주 바뀜. 실패하면 빈 배열 (매칭만 건너뜀) */
  async search(query: string): Promise<SearchCandidate[]> {
    const body = {
      searchType: "games",
      searchTerms: query.split(/\s+/).filter(Boolean),
      searchPage: 1,
      size: 20,
      searchOptions: {
        games: {
          userId: 0,
          platform: "",
          sortCategory: "popular",
          rangeCategory: "main",
          rangeTime: { min: null, max: null },
          gameplay: { perspective: "", flow: "", genre: "", difficulty: "" },
          rangeYear: { min: "", max: "" },
          modifier: "",
        },
        users: { sortCategory: "postcount" },
        lists: { sortCategory: "follows" },
        filter: "",
        sort: 0,
        randomizer: 0,
      },
      useCache: true,
    };
    try {
      const res = await fetch(HLTB_SEARCH_URL, {
        method: "POST",
        headers: { ...COMMON_HEADERS, "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      });
      if (!res.ok) return [];
      return parseHltbSearch(await res.json());
    } catch {
      return [];
    }
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
