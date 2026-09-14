// 어댑터 레지스트리 — source 이름 → 어댑터. sync/ 는 이 파일을 통해서만 어댑터에 접근한다.
import type { CompanyAdapter, MetaAdapter, NewsAdapter, Source, StoreAdapter, SubscriptionAdapter } from "./types";
import { steamAdapter } from "./steam";
import { wikidataAdapter } from "./wikidata";
import { gamepassAdapter } from "./gamepass";
import { psstoreAdapter } from "./psstore";
import { xboxAdapter } from "./xbox";
import { nintendoAdapter } from "./nintendo";
import { epicAdapter } from "./epic";
import { gogAdapter } from "./gog";
import { hltbAdapter } from "./hltb";
import { OPENCRITIC_RAPIDAPI_KEY_ENV, opencriticAdapter } from "./opencritic";
import { EPIC_ENABLE_ENV } from "./epic";
import { metacriticAdapter } from "./metacritic";
import { rssAdapter } from "./news-rss";

export const STORE_SOURCES = ["steam", "psstore", "xbox", "nintendo", "epic", "gog"] as const;
export const META_SOURCES = ["hltb", "opencritic", "metacritic"] as const;
export const NEWS_SOURCES = ["rss"] as const;
/** 회사 정보 소스 — 게임이 아니라 회사를 조회한다(§5 확장 지점) */
export const COMPANY_SOURCES = ["wikidata"] as const;
/** 구독 카탈로그 소스 — 게임 단위가 아니라 카탈로그 목록 단위로 받는다 */
export const SUBSCRIPTION_SOURCES = ["gamepass"] as const;
export const ALL_SOURCES: readonly Source[] = [
  ...STORE_SOURCES, ...META_SOURCES, ...NEWS_SOURCES, ...COMPANY_SOURCES, ...SUBSCRIPTION_SOURCES,
];

export type StoreSource = (typeof STORE_SOURCES)[number];
export type MetaSource = (typeof META_SOURCES)[number];
export type NewsSource = (typeof NEWS_SOURCES)[number];
export type CompanySource = (typeof COMPANY_SOURCES)[number];
export type SubscriptionSource = (typeof SUBSCRIPTION_SOURCES)[number];

const storeAdapters: Record<StoreSource, StoreAdapter> = {
  steam: steamAdapter,
  psstore: psstoreAdapter,
  xbox: xboxAdapter,
  nintendo: nintendoAdapter,
  epic: epicAdapter,
  gog: gogAdapter,
};
const metaAdapters: Record<MetaSource, MetaAdapter> = {
  hltb: hltbAdapter,
  opencritic: opencriticAdapter,
  metacritic: metacriticAdapter,
};
const newsAdapters: Record<NewsSource, NewsAdapter> = { rss: rssAdapter };
const companyAdapters: Record<CompanySource, CompanyAdapter> = { wikidata: wikidataAdapter };
const subscriptionAdapters: Record<SubscriptionSource, SubscriptionAdapter> = { gamepass: gamepassAdapter };

/**
 * 비활성 소스 — PoC 미통과/차단/키 없음. crawl/match 는 비활성 소스를 실행하지 않는다(sync_logs 기록 없음).
 * 사유는 관리자 대시보드에 그대로 표시된다. 환경변수에 따라 달라지는 소스가 있어 호출 시점에 평가한다(dotenv 로딩 순서).
 */
export function getDisabledReason(source: Source): string | undefined {
  switch (source) {
    case "psstore":
      return "PlayStation Store 는 클라이언트 렌더링 + persisted GraphQL 해시가 필요해 PoC 미통과 (2026-09-11)";
    case "epic":
      return process.env[EPIC_ENABLE_ENV]
        ? undefined
        : "Epic 의 Cloudflare 가 (1) 데이터센터 IP 와 (2) Node 의 TLS 지문을 모두 막는다 — " +
          "Actions 러너는 curl 로도 403, 가정용 회선에서도 Node 는 403 이고 curl 만 통과한다(2026-09-14 확인). " +
          `통과하는 전송 수단이 생기면 ${EPIC_ENABLE_ENV}=1 로 되살린다 — 파서, 질의는 그대로 있다`;
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
export function isCompanySource(s: Source): s is CompanySource {
  return (COMPANY_SOURCES as readonly string[]).includes(s);
}
export function isSubscriptionSource(s: Source): s is SubscriptionSource {
  return (SUBSCRIPTION_SOURCES as readonly string[]).includes(s);
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
export function getCompanyAdapter(source: CompanySource): CompanyAdapter {
  return companyAdapters[source];
}
export function getSubscriptionAdapter(source: SubscriptionSource): SubscriptionAdapter {
  return subscriptionAdapters[source];
}

/**
 * 제목으로 후보를 찾을 수 있는 소스. 매칭 단계(sync/match)가 쓰는 집합이다.
 * 회사, 구독 소스는 게임 제목으로 검색하는 개념 자체가 없어 여기서 빠진다.
 */
export type SearchableSource = StoreSource | MetaSource | NewsSource;
export function isSearchableSource(s: Source): s is SearchableSource {
  return isStoreSource(s) || isMetaSource(s) || isNewsSource(s);
}
export function getSearchableAdapter(source: SearchableSource): StoreAdapter | MetaAdapter | NewsAdapter {
  if (isStoreSource(source)) return storeAdapters[source];
  if (isMetaSource(source)) return metaAdapters[source];
  return newsAdapters[source];
}

/** source 이름 → 어댑터 (타입 구분 없이 minIntervalMs 만 쓸 때) */
export function getAdapter(
  source: Source,
): StoreAdapter | MetaAdapter | NewsAdapter | CompanyAdapter | SubscriptionAdapter {
  if (isStoreSource(source)) return storeAdapters[source];
  if (isMetaSource(source)) return metaAdapters[source];
  if (isCompanySource(source)) return companyAdapters[source];
  if (isSubscriptionSource(source)) return subscriptionAdapters[source];
  return newsAdapters[source as NewsSource];
}
