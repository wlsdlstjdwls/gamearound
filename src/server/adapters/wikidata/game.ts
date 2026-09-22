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
import { hasHangul, normalizeForSearch, normalizeTitle } from "@/lib/slug";
import { createHttpClient } from "../http";
import type { MetaAdapter, MetaSnapshot, SearchCandidate } from "../types";
import {
  fulltextSearchUrl,
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

/**
 * 전문 검색(list=search) 응답에서 항목 Q번호만 추린다.
 * 이 응답에는 라벨이 없다 — 이름이 같은지는 검증 단계(foldVerified + sameTitled)가 본다.
 */
export function fulltextIds(payload: unknown): string[] {
  const hits = (payload as { query?: { search?: unknown } })?.query?.search;
  if (!Array.isArray(hits)) return [];
  const out: string[] = [];
  for (const hit of hits as { title?: unknown }[]) {
    const id = hit?.title;
    // 항목(Q)만 남긴다. 이름공간을 막아도 리다이렉트 문서가 섞여 들어올 수 있다
    if (typeof id === "string" && /^Q\d+$/.test(id)) out.push(id);
  }
  return Array.from(new Set(out));
}

/** 검증 SPARQL 이 확인해 준 한 항목. names 는 라벨과 별칭을 합친 "이 항목을 부르는 모든 이름" */
export interface VerifiedGame {
  id: string;
  /** 화면과 매칭 유사도 계산에 쓰는 대표 이름 */
  title: string;
  names: string[];
}

/**
 * 검증 SPARQL 결과를 항목별로 접는다. 별칭 하나가 한 행이라 같은 항목이 여러 줄로 온다.
 * 대표 이름은 한국어 라벨을 먼저 쓴다 — 매칭 단계가 우리 제목(대개 한국어)과 견주는 값이다.
 */
export function foldVerified(bindings: Binding[], fallbackTitle: string): VerifiedGame[] {
  const byId = new Map<string, { title: string; names: Set<string> }>();
  for (const b of bindings) {
    const id = b.item?.value?.match(/\/(Q\d+)$/)?.[1];
    if (!id) continue;
    const labelKo = b.labelKo?.value;
    const labelEn = b.labelEn?.value;
    const row = byId.get(id) ?? { title: labelKo ?? labelEn ?? fallbackTitle, names: new Set<string>() };
    for (const v of [labelKo, labelEn, b.alt?.value]) if (v) row.names.add(v);
    byId.set(id, row);
  }
  return [...byId].map(([id, row]) => ({ id, title: row.title, names: [...row.names] }));
}

/**
 * 후보 중 제목이 우리 것과 정확히 같은 것만 남긴다 — 전문 검색 경로의 안전장치.
 * 전문 검색은 낱말 단위라 "젤다의 전설" 이 들어간 항목을 전부 준다. 유사도로 넓히지 않는 이유는
 * exactGameMatches 와 같다: 같은 시리즈의 다른 작품이 0.9 를 넘는다.
 */
export function sameTitled(games: VerifiedGame[], title: string): VerifiedGame[] {
  const want = normalizeForSearch(normalizeTitle(title));
  if (!want) return [];
  return games.filter((g) => g.names.some((n) => normalizeForSearch(normalizeTitle(n)) === want));
}

/**
 * 항목 하나를 **이름 수만큼의 후보**로 펼친다. 같은 Q번호가 여러 번 나오는 것이 의도다.
 *
 * 왜 이렇게 하나: 매칭(sync/match 의 pickBestCandidate)은 후보마다 `title` 하나만 보고
 * 우리 제목과의 trigram 유사도를 잰다. 그래서 어느 쪽 이름을 돌려주든 반대쪽 말로 적힌
 * 게임이 통째로 떨어졌다 — 2026-09-17 실측, 한국어 라벨만 돌려주던 때:
 *   "Counter-Strike 2" → Q111165107 "카운터-스트라이크 2" 유사도 0.00 → 미매칭
 *   "Minecraft"        → Q49740     "마인크래프트"        유사도 0.00 → 미매칭
 * 찾아 놓고 버린 것이다. 별칭이 달린 게임이 26건뿐이었던 진짜 이유가 이 한 줄이었다.
 *
 * 대표 이름을 맨 앞에 둔다 — pickBestCandidate 는 유사도가 같으면 먼저 온 것을 남기므로,
 * 동점일 때 ref.matched_title 에 적히는 값이 항목의 대표 이름이 된다.
 */
export function spreadNames(games: VerifiedGame[]): SearchCandidate[] {
  const out: SearchCandidate[] = [];
  for (const g of games) {
    const url = `https://www.wikidata.org/wiki/${g.id}`;
    const seen = new Set<string>();
    for (const name of [g.title, ...g.names]) {
      const key = normalizeForSearch(name);
      if (!key || seen.has(key)) continue;
      seen.add(key);
      out.push({ externalId: g.id, title: name, url });
    }
  }
  return out;
}

/**
 * 별칭 후보를 모은다. 빈 값과 중복은 버리고, 원문 표기는 그대로 둔다(정규화는 DB 생성 컬럼이 한다).
 * 질의가 UNION 이라 이름 하나가 한 행이고, 그 이름이 라벨인지 시리즈인지는 여기서 가리지 않는다 —
 * 어느 쪽이든 검색에 걸려야 하는 말이라 쓰임이 같다(constants 의 gameAliasQuery 주석).
 */
export function collectAliases(bindings: Binding[]): string[] {
  const out = new Set<string>();
  for (const b of bindings) {
    const v = b.name?.value?.trim();
    if (v) out.add(v);
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

  /**
   * 이름으로 후보를 찾는다. 접두 검색(wbsearchentities)이 먼저고, 빈손이면 전문 검색으로 한 번 더.
   *
   * 접두 검색이 왜 빈손이 되나: 위키데이터 라벨은 콜론을 달고 있는데 스토어 제목에는 없어서
   * 거기서 어긋난다. 2026-09-17 실측 — 우리 "PUBG: BATTLEGROUNDS" 는 정규화로 콜론이 지워져
   * "pubg battlegrounds" 가 되고, 라벨 "PUBG: Battlegrounds" 의 접두와 맞지 않아 0건이 나온다.
   * 한국어 라벨은 그 위에 말까지 달라서 아예 닿지 못했다("젤다의 전설: 브레스 오브 더 와일드").
   *
   * 그래서 한글 질의는 접두 검색을 건너뛴다 — 될 리가 없는 요청을 보낼 이유가 없다.
   * 영문 질의는 접두 검색이 대개 맞히므로 그대로 두고, 빈손일 때만 한 번 더 나간다(요청 1회 추가).
   *
   * 전문 검색으로 받은 후보는 반드시 sameTitled 로 거른다 — 낱말 단위 검색이라
   * "젤다의 전설" 이 들어간 항목을 전부 준다. 접두 검색 쪽은 응답에 라벨과 별칭이 실려 와서
   * 그 검사를 이미 exactGameMatches 가 끝냈다.
   */
  async search(query: string): Promise<SearchCandidate[]> {
    const title = normalizeTitle(query) || query;
    let fromFulltext = hasHangul(query);
    let ids: string[] = [];

    if (!fromFulltext) {
      ids = exactGameMatches(await api.json(searchUrl(title, "en")), query);
      if (ids.length === 0) fromFulltext = true;
    }
    if (fromFulltext) ids = fulltextIds(await api.json(fulltextSearchUrl(title)));
    if (ids.length === 0) return [];

    // 분류 확인. 이 단계가 영화, 소설, 시리즈 문서를 떨어뜨린다
    const verified = (await sparql.json(sparqlUrl(gameVerifyQuery(ids.slice(0, VERIFY_MAX_CANDIDATES))))) as SparqlResult;
    const folded = foldVerified(verified.results?.bindings ?? [], title);
    return spreadNames(fromFulltext ? sameTitled(folded, query) : folded);
  },

  async fetch(externalId: string): Promise<MetaSnapshot> {
    const res = (await sparql.json(sparqlUrl(gameAliasQuery(externalId)))) as SparqlResult;
    return { aliases: collectAliases(res.results?.bindings ?? []) };
  },
};
