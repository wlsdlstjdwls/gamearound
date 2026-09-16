// 어댑터 레지스트리 — source 이름 → 어댑터. sync/ 는 이 파일을 통해서만 어댑터에 접근한다.
import type { CompanyAdapter, MetaAdapter, NewsAdapter, Source, StoreAdapter, SubscriptionAdapter } from "./types";
import { steamAdapter } from "./steam";
import { wikidataAdapter } from "./wikidata";
import { gamepassAdapter } from "./gamepass";
import { psstoreAdapter } from "./psstore";
import { xboxAdapter } from "./xbox";
import { nintendoAdapter, nintendoJpAdapter } from "./nintendo";
import { epicAdapter } from "./epic";
import { gogAdapter } from "./gog";
import { hltbAdapter } from "./hltb";
import { OPENCRITIC_RAPIDAPI_KEY_ENV, opencriticAdapter } from "./opencritic";
import { EPIC_ENABLE_ENV } from "./epic";
import { CRAWL_PROXY_URL_ENV, crawlProxyUrl, runsInSeoulRegion } from "./http";
import { metacriticAdapter } from "./metacritic";
import { rssAdapter } from "./news-rss";
import { wikidataGameAdapter } from "./wikidata/game";

export const STORE_SOURCES = ["steam", "psstore", "xbox", "nintendo", "nintendo_jp", "epic", "gog"] as const;
// wikidata_game 이 여기 있는 이유: 조회 경로가 메타 소스와 같다(제목으로 매칭한 뒤 단건 조회).
// 회사 소스 wikidata 와는 다른 소스다 — 그쪽은 회사 항목을, 이쪽은 게임 항목을 찾는다(schema 의 sourceEnum 주석).
export const META_SOURCES = ["hltb", "opencritic", "metacritic", "wikidata_game"] as const;
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
  nintendo_jp: nintendoJpAdapter,
  epic: epicAdapter,
  gog: gogAdapter,
};
const metaAdapters: Record<MetaSource, MetaAdapter> = {
  hltb: hltbAdapter,
  opencritic: opencriticAdapter,
  metacritic: metacriticAdapter,
  wikidata_game: wikidataGameAdapter,
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
    case "epic":
      // 프록시가 설정돼 있으면 켠다 — 막는 기준이 IP 대역이라 주거용 출구를 거치면 통과한다.
      // 데이터센터 프록시를 넣으면 여전히 403 이 나는데, 그건 로그에 그대로 드러나는 편이 낫다.
      // 서울 리전 함수도 켠다 — 그 IP 는 Cloudflare 를 통과한다(2026-09-14 실측, curl 전송기 기준).
      return process.env[EPIC_ENABLE_ENV] || crawlProxyUrl() || runsInSeoulRegion()
        ? undefined
        : "Epic 의 Cloudflare 가 (1) 데이터센터 IP 와 (2) Node 의 TLS 지문을 모두 막는다 — " +
          "Actions 러너는 curl 로도 403, 가정용 회선에서도 Node 는 403 이고 curl 만 통과한다(2026-09-14 확인). " +
          `주거용 출구 프록시를 ${CRAWL_PROXY_URL_ENV} 에 넣거나, 가정용 회선에서 ${EPIC_ENABLE_ENV}=1 로 켠다 — 파서, 질의는 그대로 있다`;
    case "gog":
      // 막혀서가 아니라 **쓸 값이 아니라서** 끈다. 2026-09-16 실측: 우리가 가졌던 gog 행 4,449개가
      // 한 건도 빠짐없이 USD 였다 — 원화 판매가 자체가 없다. §5 의 환산 금지 때문에 화면은 이미
      // USD 행을 버리고 있었고(lib/currency 의 sameCurrency), 스팀에도 있는 1,063건에서 gog 는
      // 가격 비교와 차트에 아예 안 나왔다. 값을 못 쓰는 스토어에 크론 몫 두 자리(prices 400건,
      // discover 190건, 합쳐 약 20분/일)를 계속 쓸 이유가 없다.
      //
      // 2026-09-16 그 행들을 DB 에서 지웠다 — game_platforms 4,449(스냅샷 4,293, 패치 156 은 cascade),
      // game_source_refs 4,940, gog 만 가졌던 게임 3,386 과 그 자식 DLC 777. 숨김이 아니라 삭제라
      // 되살리려면 발견부터 다시 긁는다.
      // 어댑터, 파서, 질의는 그대로 둔다(§5). 되살리려면 이 case 와 lib/platform 의
      // HIDDEN_PLATFORMS 에서 gog 를 같이 빼면 된다 — 원화를 받을 길이 생겼을 때가 그때다.
      return "GOG 가 한국에 달러로만 판다 — 우리가 가졌던 gog 행 4,449개가 전부 USD 였다(2026-09-16 실측). 그 행들은 같은 날 지웠다. " +
        "원화 가격 서비스에서 비교에 쓸 수 없어 수집과 화면 노출을 함께 멈췄다. " +
        "화면 쪽 짝은 lib/platform 의 HIDDEN_PLATFORMS 다. 원화 판매가가 생기면 둘 다 풀면 된다";
    case "psstore":
      // 2026-09-16 에 껐다가 같은 날 되살렸다. 끈 근거는 "카탈로그가 찼다" 였는데 그 판단이 틀렸다 —
      // 찬 것은 행 수(43,405건)였지 값이 아니었다. 실측으로 그 행의 98.7%가 출시일을 모른다
      // (ps4 122/2,416, ps5 424/2,365). 날짜는 콘셉트 상세 응답에만 있고, psprices 병합으로 들어온 행은
      // 그 조회를 한 번도 받은 적이 없다. 끄면 그 값은 영원히 안 온다.
      // 다시 끌 일이 생기면 이 문단을 먼저 읽는다: PS 는 행이 제일 많은 스토어라(steam 5,550 대 ps 43,405)
      // 정지가 화면 전체에 그대로 보인다.
      return undefined;
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
