// 어댑터 레지스트리 — source 이름 → 어댑터. sync/ 는 이 파일을 통해서만 어댑터에 접근한다.
import type { MetaAdapter, NewsAdapter, Source, StoreAdapter } from "./types";
import { steamAdapter } from "./steam";
import { psstoreAdapter } from "./psstore";
import { xboxAdapter } from "./xbox";
import { nintendoAdapter } from "./nintendo";
import { hltbAdapter } from "./hltb";
import { OPENCRITIC_RAPIDAPI_KEY_ENV, opencriticAdapter } from "./opencritic";
import { metacriticAdapter } from "./metacritic";
import { rssAdapter } from "./news-rss";

export const STORE_SOURCES = ["steam", "psstore", "xbox", "nintendo"] as const;
export const META_SOURCES = ["hltb", "opencritic", "metacritic"] as const;
export const NEWS_SOURCES = ["rss"] as const;
export const ALL_SOURCES: readonly Source[] = [...STORE_SOURCES, ...META_SOURCES, ...NEWS_SOURCES];

export type StoreSource = (typeof STORE_SOURCES)[number];
export type MetaSource = (typeof META_SOURCES)[number];
export type NewsSource = (typeof NEWS_SOURCES)[number];

const storeAdapters: Record<StoreSource, StoreAdapter> = {
  steam: steamAdapter,
  psstore: psstoreAdapter,
  xbox: xboxAdapter,
  nintendo: nintendoAdapter,
};
const metaAdapters: Record<MetaSource, MetaAdapter> = {
  hltb: hltbAdapter,
  opencritic: opencriticAdapter,
  metacritic: metacriticAdapter,
};
const newsAdapters: Record<NewsSource, NewsAdapter> = { rss: rssAdapter };

/**
 * 비활성 소스 — PoC 미통과/차단/키 없음. crawl/match 는 비활성 소스를 실행하지 않는다(sync_logs 기록 없음).
 * 사유는 관리자 대시보드에 그대로 표시된다. 환경변수에 따라 달라지는 소스가 있어 호출 시점에 평가한다(dotenv 로딩 순서).
 */
export function getDisabledReason(source: Source): string | undefined {
  switch (source) {
    case "psstore":
      return "PlayStation Store 는 클라이언트 렌더링 + persisted GraphQL 해시가 필요해 PoC 미통과 (2026-09-11)";
    case "hltb":
      return "HowLongToBeat 검색 API(/api/search)가 404 — 경로/토큰 변경으로 매칭 불가(2026-09-11 확인). 어댑터 재구현 필요";
    case "opencritic":
      return process.env[OPENCRITIC_RAPIDAPI_KEY_ENV]
        ? undefined
        : `OpenCritic API 가 RapidAPI 키를 요구함(HTTP 400, 2026-09-11 확인). ${OPENCRITIC_RAPIDAPI_KEY_ENV} 환경변수(Actions secret) 설정 시 자동 활성`;
    default:
      return undefined;
  }
}

export function isSourceEnabled(source: Source): boolean {
  return getDisabledReason(source) === undefined;
}

export function isSource(v: string): v is Source {
  return (ALL_SOURCES as readonly string[]).includes(v);
}
export function isStoreSource(s: Source): s is StoreSource {
  return (STORE_SOURCES as readonly string[]).includes(s);
}
export function isMetaSource(s: Source): s is MetaSource {
  return (META_SOURCES as readonly string[]).includes(s);
}
export function isNewsSource(s: Source): s is NewsSource {
  return (NEWS_SOURCES as readonly string[]).includes(s);
}

export function getStoreAdapter(source: StoreSource): StoreAdapter {
  return storeAdapters[source];
}
export function getMetaAdapter(source: MetaSource): MetaAdapter {
  return metaAdapters[source];
}
export function getNewsAdapter(source: NewsSource): NewsAdapter {
  return newsAdapters[source];
}

/** source 이름 → 어댑터 (타입 구분 없이 search/minIntervalMs 만 쓸 때) */
export function getAdapter(source: Source): StoreAdapter | MetaAdapter | NewsAdapter {
  if (isStoreSource(source)) return storeAdapters[source];
  if (isMetaSource(source)) return metaAdapters[source];
  return newsAdapters[source as NewsSource];
}
