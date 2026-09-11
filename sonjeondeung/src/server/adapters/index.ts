// 어댑터 레지스트리 — source 이름 → 어댑터. sync/ 는 이 파일을 통해서만 어댑터에 접근한다.
import type { MetaAdapter, NewsAdapter, Source, StoreAdapter } from "./types";
import { steamAdapter } from "./steam";
import { psstoreAdapter } from "./psstore";
import { xboxAdapter } from "./xbox";
import { nintendoAdapter } from "./nintendo";
import { hltbAdapter } from "./hltb";
import { opencriticAdapter } from "./opencritic";
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
 * 비활성 소스 — PoC 미통과로 구현되지 않았거나 차단된 소스. crawl/match 는 이 목록에 있으면 실행하지 않는다(sync_logs 기록 없음).
 * 활성화하려면 어댑터를 구현하고 여기서 제거한다. 사유는 관리자 대시보드에 그대로 표시된다.
 */
export const DISABLED_SOURCES: Readonly<Partial<Record<Source, string>>> = {
  psstore: "PlayStation Store 는 클라이언트 렌더링 + persisted GraphQL 해시가 필요해 PoC 미통과 (2026-09-11)",
};

export function isSourceEnabled(source: Source): boolean {
  return DISABLED_SOURCES[source] === undefined;
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
