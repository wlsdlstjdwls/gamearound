// 위키데이터 회사 어댑터 — 기획서 F1, F2.
// 스토어는 회사명 문자열만 주고 국가를 주지 않는다(xbox 의 PublisherAddress 는 표본에서 null, 2026-09-14 실측).
// 위키데이터를 고른 이유: 키가 필요 없고, 본문 데이터가 CC0 라 재배포 제약이 없으며, 한국어 회사명이 바로 나온다.
//
// 2단계로 나눈 이유가 성능이다. 라벨을 조건으로 훑는 SPARQL 은 분류 제약을 붙여도 30초 타임아웃이 났다(실측).
// 이름으로 후보를 찾는 일은 검색 API(0.7초)에, 속성 채우기는 후보를 VALUES 로 못박은 SPARQL(1.5초)에 맡긴다.
//
// PoC(2026-09-14): "FromSoftware, Inc." 에서 Q2414469, 한국어명 "프롬소프트웨어", 국가 "일본"(JP),
// 설립 1986-11-01, 본사 "도쿄도", 공식 사이트 확인.
import { cleanCompanyName } from "@/lib/company-name";
import { createHttpClient } from "../http";
import type { CompanyAdapter, CompanyInfo } from "../types";
import {
  VERIFY_MAX_CANDIDATES,
  WIKIDATA_MIN_INTERVAL_MS,
  WIKIDATA_SPARQL_URL,
  WIKIDATA_TIMEOUT_MS,
  companyDetailQuery,
  searchUrl,
} from "./constants";
import { exactSearchMatches, resolveSingleCompany } from "./parse";

export { companyDetailQuery, searchUrl, WIKIDATA_SPARQL_URL } from "./constants";
export { exactSearchMatches, groupCompanies, resolveSingleCompany, entityId, toIsoDate } from "./parse";

const sparql = createHttpClient({
  source: "wikidata",
  label: "Wikidata SPARQL",
  timeoutMs: WIKIDATA_TIMEOUT_MS,
  headers: { Accept: "application/sparql-results+json" },
});

const api = createHttpClient({ source: "wikidata", label: "Wikidata API" });

/** 한글이 섞인 회사명은 영어로 검색해도 안 걸린다. 검색 언어를 바꿔 한 번 더 시도한다 */
const HANGUL = /[가-힣]/;

export const wikidataAdapter: CompanyAdapter = {
  source: "wikidata",
  minIntervalMs: WIKIDATA_MIN_INTERVAL_MS,

  async lookup(name: string): Promise<CompanyInfo | null> {
    const query = cleanCompanyName(name);
    if (!query) return null;

    const languages = HANGUL.test(query) ? ["ko", "en"] : ["en", "ko"];
    let candidates: string[] = [];
    for (const lang of languages) {
      const hits = await api.json(searchUrl(query, lang), { context: `${query} (${lang})` });
      candidates = exactSearchMatches(hits, query);
      if (candidates.length > 0) break;
    }
    // 후보가 없으면 이 이름은 위키데이터에 없다. 너무 많으면 어차피 자동 확정하지 않는다
    if (candidates.length === 0 || candidates.length > VERIFY_MAX_CANDIDATES) return null;

    const payload = await sparql.json(WIKIDATA_SPARQL_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ query: companyDetailQuery(candidates) }).toString(),
      context: query,
    });
    const found = resolveSingleCompany(payload);
    if (!found) return null;
    // 위키데이터에 영문 라벨이 없으면 스토어가 준 원문을 이름으로 쓴다 — Q번호를 화면에 띄우지 않기 위해
    return /^Q\d+$/.test(found.nameEn) ? { ...found, nameEn: query } : found;
  },
};
