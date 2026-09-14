// 위키데이터 게임 어댑터 — 검색 별칭(game_aliases)의 자동 출처.
//
// 왜 별칭을 밖에서 받아야 하나: "해리포터" 로 "호그와트 레거시" 를 찾으려면 제목에 없는 말이 필요하다.
// 스토어는 그 값을 주지 않는다 — 스팀의 basic_info.franchises 는 호그와트 레거시에 "WB Games"(퍼블리셔)를
// 주고 위쳐 3, 사이버펑크에는 아예 없다(2026-09-15 실측). 그래서 백과사전을 쓴다.
//
// 회사 어댑터와 같은 2단계다. 이름으로 후보를 찾는 일은 검색 API 에, 분류 확인과 속성 채우기는
// VALUES 로 못박은 SPARQL 에 맡긴다 — 라벨을 조건으로 스캔하는 질의는 타임아웃이 난다.
//
// 분류 확인을 건너뛰면 안 된다: 라벨 "Elden Ring" 을 그냥 찾으면 **영화 기획 항목**이 먼저 나온다(실측).
import { normalizeForSearch, normalizeTitle } from "@/lib/slug";
import { createHttpClient } from "../http";
import type { MetaAdapter, MetaSnapshot, SearchCandidate } from "../types";
import {
  gameAliasQuery,
  gameVerifyQuery,
  searchUrl,
  VERIFY_MAX_CANDIDATES,
  WIKIDATA_MIN_INTERVAL_MS,
  WIKIDATA_SPARQL_URL,
  WIKIDATA_TIMEOUT_MS,
} from "./constants";

const api = createHttpClient({ source: "wikidata_game", label: "Wikidata API" });
const sparql = createHttpClient({
  source: "wikidata_game",
  label: "Wikidata SPARQL",
  timeoutMs: WIKIDATA_TIMEOUT_MS,
  headers: { Accept: "application/sparql-results+json" },
});

interface SearchHit { id?: string; label?: string; aliases?: string[]; match?: { text?: string } }
type Binding = Record<string, { value: string } | undefined>;
interface SparqlResult { results?: { bindings?: Binding[] } }

function sparqlUrl(query: string): string {
  return `${WIKIDATA_SPARQL_URL}?query=${encodeURIComponent(query)}`;
}

/**
 * 검색 결과에서 제목이 정확히 같은 후보만 남긴다.
 * 제목 비교는 normalizeForSearch 로 한다 — 구두점, 공백, 대소문자만 다른 표기를 흡수한다
 * ("Tekken 8" / "TEKKEN 8", "The Legend of Zelda: Tears of the Kingdom" / "...Zelda Tears of the Kingdom").
 * 유사도로 넓히지 않는 이유: 같은 시리즈의 다른 작품이 0.9 를 넘는다 — 그걸 붙이면 별칭이 통째로 틀린다.
 */
export function exactGameMatches(payload: unknown, title: string): string[] {
  const hits = (payload as { search?: unknown })?.search;
  if (!Array.isArray(hits)) return [];
  const want = normalizeForSearch(normalizeTitle(title));
  if (!want) return [];
  const out: string[] = [];
  for (const hit of hits as SearchHit[]) {
    if (!hit || typeof hit.id !== "string") continue;
    const names = [hit.label, hit.match?.text, ...(hit.aliases ?? [])].filter((v): v is string => typeof v === "string");
    if (names.some((n) => normalizeForSearch(normalizeTitle(n)) === want)) out.push(hit.id);
  }
  return Array.from(new Set(out));
}

/** 별칭 후보를 모은다. 빈 값과 중복은 버리고, 원문 표기는 그대로 둔다(정규화는 DB 생성 컬럼이 한다) */
export function collectAliases(bindings: Binding[]): string[] {
  const out = new Set<string>();
  for (const b of bindings) {
    for (const key of ["series", "based", "alt"]) {
      const v = b[key]?.value?.trim();
      if (v) out.add(v);
    }
  }
  return [...out];
}

/**
 * 게임 제목에서 그 게임의 별칭이 되지 못하는 값을 걸러 낸다.
 * 제목과 정규화가 같은 별칭은 넣어 봐야 검색 결과가 달라지지 않는다 — 자리만 차지한다.
 */
export function usefulAliases(aliases: string[], title: string): string[] {
  const self = normalizeForSearch(normalizeTitle(title));
  return aliases.filter((a) => {
    const n = normalizeForSearch(a);
    return n.length > 0 && n !== self;
  });
}

export const wikidataGameAdapter: MetaAdapter = {
  source: "wikidata_game",
  minIntervalMs: WIKIDATA_MIN_INTERVAL_MS,

  async search(query: string): Promise<SearchCandidate[]> {
    const title = normalizeTitle(query) || query;
    const found = await api.json(searchUrl(title, "en"));
    const ids = exactGameMatches(found, query).slice(0, VERIFY_MAX_CANDIDATES);
    if (ids.length === 0) return [];

    // 분류 확인. 이 단계가 영화, 소설, 시리즈 문서를 떨어뜨린다
    const verified = (await sparql.json(sparqlUrl(gameVerifyQuery(ids)))) as SparqlResult;
    const seen = new Map<string, string>();
    for (const b of verified.results?.bindings ?? []) {
      const id = b.item?.value?.match(/\/(Q\d+)$/)?.[1];
      if (!id) continue;
      // 매칭 단계가 우리 제목과 견주는 값이라 한국어 라벨이 있으면 그쪽이 낫다
      seen.set(id, b.labelKo?.value ?? b.labelEn?.value ?? title);
    }
    return [...seen].map(([id, label]) => ({
      externalId: id,
      title: label,
      url: `https://www.wikidata.org/wiki/${id}`,
    }));
  },

  async fetch(externalId: string): Promise<MetaSnapshot> {
    const res = (await sparql.json(sparqlUrl(gameAliasQuery(externalId)))) as SparqlResult;
    return { aliases: collectAliases(res.results?.bindings ?? []) };
  },
};
