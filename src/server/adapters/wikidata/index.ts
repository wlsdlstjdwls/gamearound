// 위키데이터 회사 어댑터 — 기획서 F1, F2.
// 스토어는 회사명 문자열만 주고 국가를 주지 않는다(xbox 의 PublisherAddress 는 표본에서 null, 2026-09-14 실측).
// 위키데이터를 고른 이유: 키가 필요 없고, 본문 데이터가 CC0 라 재배포 제약이 없으며, 한국어 회사명이 바로 나온다.
//
// 2단계로 나눈 이유가 성능이다. 라벨을 조건으로 훑는 SPARQL 은 분류 제약을 붙여도 30초 타임아웃이 났다(실측).
// 이름으로 후보를 찾는 일은 검색 API(0.7초)에, 속성 채우기는 후보를 VALUES 로 못박은 SPARQL(1.5초)에 맡긴다.
//
// 경로는 하나다. lookup(관리자가 한 이름을 누를 때)도 lookupMany 에 이름 하나를 넣어 부른다 —
// 판정 규칙이 두 벌이 되면 화면 버튼과 크론이 같은 이름에 다른 답을 낸다.
//
// PoC(2026-09-14): "FromSoftware, Inc." 에서 Q2414469, 한국어명 "프롬소프트웨어", 국가 "일본"(JP),
// 설립 1986-11-01, 본사 "도쿄도", 공식 사이트 확인.
import { cleanCompanyName } from "@/lib/company-name";
import { sleep } from "@/lib/async";
import { createHttpClient } from "../http";
import type { CompanyAdapter, CompanyInfo, CompanyLookupBatch, CompanyLookupOptions } from "../types";
import {
  SPARQL_BATCH_MAX_CANDIDATES,
  SPARQL_ROWS_PER_CANDIDATE,
  VERIFY_MAX_CANDIDATES,
  WIKIDATA_MIN_INTERVAL_MS,
  WIKIDATA_SEARCH_INTERVAL_MS,
  WIKIDATA_SPARQL_URL,
  WIKIDATA_TIMEOUT_MS,
  companyDetailQuery,
  searchUrl,
} from "./constants";
import { chunkCandidates, exactSearchMatches, groupCompanies, resolveCandidates } from "./parse";

export { companyDetailQuery, searchUrl, WIKIDATA_SPARQL_URL } from "./constants";
export {
  chunkCandidates,
  exactSearchMatches,
  groupCompanies,
  pickCompany,
  resolveCandidates,
  resolveSingleCompany,
  entityId,
  toIsoDate,
} from "./parse";

const sparql = createHttpClient({
  source: "wikidata",
  label: "Wikidata SPARQL",
  timeoutMs: WIKIDATA_TIMEOUT_MS,
  headers: { Accept: "application/sparql-results+json" },
});

const api = createHttpClient({ source: "wikidata", label: "Wikidata API" });

/** 한글이 섞인 회사명은 영어로 검색해도 안 걸린다. 검색 언어를 바꿔 한 번 더 시도한다 */
const HANGUL = /[가-힣]/;

const once = <T>(fn: () => Promise<T>) => fn();

/** 이름 하나의 후보 Q번호. 언어를 바꿔 가며 찾다가 처음 걸린 언어에서 멈춘다 */
async function searchCandidates(query: string, retry: CompanyLookupOptions["retry"] = once): Promise<string[]> {
  const languages = HANGUL.test(query) ? ["ko", "en"] : ["en", "ko"];
  for (const [i, lang] of languages.entries()) {
    if (i > 0) await sleep(WIKIDATA_SEARCH_INTERVAL_MS);
    const hits = await retry(() => api.json(searchUrl(query, lang), { context: `${query} (${lang})` }));
    const candidates = exactSearchMatches(hits, query);
    if (candidates.length > 0) return candidates;
  }
  return [];
}

async function fetchDetails(ids: string[], retry: CompanyLookupOptions["retry"] = once): Promise<Map<string, CompanyInfo>> {
  const payload = await retry(() =>
    sparql.json(WIKIDATA_SPARQL_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ query: companyDetailQuery(ids, ids.length * SPARQL_ROWS_PER_CANDIDATE) }).toString(),
      context: `${ids.length} candidates`,
    }),
  );
  return groupCompanies(payload);
}

/**
 * 세 단이다: ① 검색만 전부 먼저 ② 후보를 묶어 상세 SPARQL 몇 번 ③ 이름별 판정.
 * 검색이 마감에 걸리면 거기서 멈추고 이미 찾은 이름만 판정한다 — 절반을 버리지 않는다.
 */
async function lookupMany(names: string[], opts: CompanyLookupOptions): Promise<CompanyLookupBatch> {
  const errors: CompanyLookupBatch["errors"] = [];
  // 판정은 정리한 이름(query)으로 하고, 돌려줄 때 호출부가 준 원문으로 되돌린다
  const queryOf = new Map<string, string>();
  const candidatesByQuery = new Map<string, string[]>();

  for (const [i, name] of names.entries()) {
    if (opts.deadline !== undefined && Date.now() >= opts.deadline) break;
    const query = cleanCompanyName(name);
    if (!query) continue;
    if (i > 0) await sleep(WIKIDATA_SEARCH_INTERVAL_MS);
    try {
      const found = await searchCandidates(query, opts.retry);
      queryOf.set(name, query);
      candidatesByQuery.set(query, found);
    } catch (error) {
      errors.push({ name, error });
    }
  }

  const details = new Map<string, CompanyInfo>();
  const failedIds = new Set<string>();
  // 후보가 너무 많은 이름은 어차피 한 회사로 못 좁힌다 — 상세 질의에 싣지 않는다.
  // 상세가 하나도 안 오니 판정 단계에서 저절로 ambiguous 가 된다
  const toFetch = new Map([...candidatesByQuery].filter(([, ids]) => ids.length <= VERIFY_MAX_CANDIDATES));
  for (const chunk of chunkCandidates(toFetch, SPARQL_BATCH_MAX_CANDIDATES)) {
    try {
      for (const [id, info] of await fetchDetails(chunk, opts.retry)) details.set(id, info);
    } catch (error) {
      for (const id of chunk) failedIds.add(id);
      errors.push({ name: `sparql(${chunk.length})`, error });
    }
  }

  const judged = resolveCandidates(candidatesByQuery, details);
  const results: CompanyLookupBatch["results"] = new Map();
  for (const [name, query] of queryOf) {
    // 상세 질의가 실패한 후보를 가진 이름은 판정하지 않는다 — "못 좁힘" 으로 적으면 한동안 다시 안 묻는다
    if ((candidatesByQuery.get(query) ?? []).some((id) => failedIds.has(id))) continue;
    const verdict = judged.get(query);
    if (verdict) results.set(name, verdict);
  }
  return { results, errors };
}

export const wikidataAdapter: CompanyAdapter = {
  source: "wikidata",
  minIntervalMs: WIKIDATA_MIN_INTERVAL_MS,
  lookupMany,

  async lookup(name: string): Promise<CompanyInfo | null> {
    const { results, errors } = await lookupMany([name], {});
    if (errors.length > 0) throw errors[0].error;
    const verdict = results.get(name);
    return verdict?.status === "found" ? verdict.info : null;
  },
};
