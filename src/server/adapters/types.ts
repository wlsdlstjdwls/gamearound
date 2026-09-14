// 어댑터 인터페이스 — 설계서 §4.1. 어댑터는 "가져오기만" 한다. DB 반영은 sync/가 맡음.
import type { Currency, Platform } from "@/server/db/schema";

/** 크롤러 공통 User-Agent (§10: UA 명시) — 실제 값은 서비스 아이덴티티(lib/site)에서 만든다 */
export { CRAWLER_USER_AGENT } from "@/lib/site";

export type Source = "steam" | "psstore" | "xbox" | "nintendo" | "epic" | "gog" | "hltb" | "opencritic" | "metacritic" | "rss" | "wikidata" | "gamepass";

export interface StoreSnapshot {
  platform: Platform;
  storeExternalId: string;
  storeUrl: string;
  /** 통화의 최소 단위 정수(KRW=원, USD=센트). 통화는 아래 currency 가 말한다 */
  listPrice: number | null;
  currentPrice: number | null;
  /** 이 스토어가 파는 통화. 주지 않으면 KRW 로 본다 — 기존 소스는 전부 원화다 */
  currency?: Currency;
  discountPct: number | null;
  /** 할인 시작 시각 (ISO datetime). 주는 소스만 채움 — xbox */
  discountStartsAt?: string | null;
  /** 할인 종료 예정 시각 (ISO datetime). steam, xbox */
  discountEndsAt?: string | null;
  /** 행사명 ("여름 세일", "주말 특가" 등). steam 만 토큰 → 한국어 라벨 */
  discountName?: string | null;
  currentVersion?: string | null;
  releaseDate?: string | null;   // ISO date (YYYY-MM-DD)
  /**
   * 이 스토어가 "추가 콘텐츠 있음"이라고 알려준 값. xbox Properties.HasAddOns 가 준다.
   * DLC 목록을 못 가져오는 플랫폼에서도 유무만은 표시하기 위한 별도 신호다.
   */
  hasAddOns?: boolean | null;
  /** 본편이 알려주는 DLC 외부 ID 목록. steam appdetails 의 dlc 배열 (2026-09-14 실측) */
  dlcExternalIds?: string[];
  /** DLC 가 알려주는 본편 외부 ID. steam appdetails 의 fullgame.appid */
  parentExternalId?: string | null;
  /** 이 레코드 자체가 본편인지 DLC 인지. 주지 않는 소스는 undefined(= 본편으로 본다) */
  contentType?: "game" | "dlc" | null;
  // Steam 기준 소스에서만 채워지는 게임 마스터 정보(신규 게임 생성용)
  meta?: {
    titleEn: string;
    titleKo?: string | null;
    description?: string | null;
    /** 가로 배너(460×215) — 카드, 목록용 */
    coverUrl?: string | null;
    /** 세로 아트(600×900) — 상세 헤더용. 주는 소스만 채움(steam GetItems) */
    portraitUrl?: string | null;
    developer?: string | null;
    publisher?: string | null;
    genres?: string[];
    multiplayer?: { localMax?: number; onlineMax?: number; coop?: boolean; pvp?: boolean; solo?: boolean };
  };
}

export interface MetaSnapshot {
  playtime?: { main: number | null; extra: number | null; completionist: number | null };
  scores?: { metacritic?: number | null; opencritic?: number | null };
  genres?: string[];
  multiplayer?: { localMax?: number; onlineMax?: number; coop?: boolean; pvp?: boolean };
}

/**
 * 회사 정보. 스토어가 아니라 백과사전(위키데이터)에서 온다 — 스토어는 회사명 문자열만 주고 국가를 주지 않는다.
 * 값이 없는 필드는 null 로 오고, sync 는 null 로 기존 값을 덮지 않는다.
 */
export interface CompanyInfo {
  /** 외부 식별자(위키데이터 Q번호). 재조회 키이자 중복 방지 키 */
  externalId: string;
  nameEn: string;
  nameKo: string | null;
  countryCode: string | null;   // ISO 3166-1 alpha-2
  countryNameKo: string | null;
  foundedAt: string | null;     // YYYY-MM-DD
  hqNameKo: string | null;
  websiteUrl: string | null;
  description: string | null;
}

/**
 * 회사 조회 어댑터. `lookup` 은 **확실할 때만** 값을 준다 —
 * 동명이인(같은 이름의 다른 회사)을 자동 확정하면 국가가 틀린 채로 화면에 박힌다.
 * 후보가 0건이거나 2건 이상이면 null 을 돌려주고, 호출부가 관리자 검수 큐로 넘긴다.
 */
export interface CompanyAdapter {
  source: Source;
  lookup(name: string): Promise<CompanyInfo | null>;
  minIntervalMs: number;
}

/**
 * 구독 카탈로그 어댑터. 구독은 게임 단위가 아니라 "카탈로그 전체 목록" 단위로 온다.
 * 반환값은 스토어 외부 ID 목록이고, 우리 DB 의 game_platforms.store_external_id 와 맞춘다.
 */
export interface SubscriptionAdapter {
  source: Source;
  /** catalogId 는 subscriptions.catalog_id (Game Pass 컬렉션 GUID 등) */
  fetchCatalog(catalogId: string): Promise<string[]>;
  minIntervalMs: number;
}

export interface NewsItem {
  title: string;
  url: string;
  sourceName: string;
  thumbnailUrl?: string;
  publishedAt: string; // ISO datetime
}

export interface SearchCandidate {
  externalId: string;
  title: string;
  url: string;
  /**
   * 목록 응답에만 이미지가 있는 소스(psstore)를 위한 자리. 단건 조회로는 못 얻는 값이라
   * 발견 단계에서 들고 내려간다 — 채우지 않는 소스는 undefined 다.
   */
  coverUrl?: string | null;
  portraitUrl?: string | null;
}

export interface SourceAdapter<T extends StoreSnapshot | MetaSnapshot | NewsItem[]> {
  source: Source;
  /** 제목으로 후보 검색 — 매칭 단계용 */
  search(query: string): Promise<SearchCandidate[]>;
  /** 외부 ID로 단건 조회 */
  fetch(externalId: string): Promise<T>;
  /**
   * 여러 ID를 한 요청으로 조회 (지원하는 소스만). 카탈로그가 수만 건이면 단건 조회로는 예산이 안 나온다.
   * 반환 Map 에 없는 ID = 그 게임만 실패 — 배치 전체를 실패로 만들지 않는다.
   */
  fetchMany?(externalIds: string[]): Promise<Map<string, T>>;
  /** fetchMany 한 요청에 넣을 수 있는 ID 수 */
  batchSize?: number;
  /**
   * 카탈로그를 페이지 단위로 훑는다 (지원하는 소스만). 이게 없으면 그 소스는
   * 이미 등록된 게임에 가격을 붙이기만 할 뿐, 그 플랫폼 독점작을 영원히 못 가져온다.
   *
   * "상위 N개" 가 아니라 페이지를 흘려보내는 이유: N 이 카탈로그보다 작은 소스(steam, nintendo)에서
   * 상위 N개만 돌려주면 그 N개가 전부 이미 아는 것이 된 순간 신규가 영원히 0건이 된다.
   * 어디까지 아는지는 DB 를 보는 호출부(sync/store-targets)만 알기 때문에, 거르는 일도 멈출 시점도 호출부가 정한다.
   * 요청 간격(minIntervalMs)은 페이지를 넘길 때마다 어댑터가 지킨다.
   */
  discoverPages?(): AsyncIterable<SearchCandidate[]>;
  /** 소스별 요청 간격(ms). 크롤 대상은 보수적으로 */
  minIntervalMs: number;
}

export type StoreAdapter = SourceAdapter<StoreSnapshot> & {
  /**
   * 본편이 가진 DLC 외부 ID 목록. 배치 조회가 "자식 → 부모" 방향만 주는 소스(steam GetItems)에서는
   * 본편을 아무리 갱신해도 그 본편의 DLC 를 영원히 못 만난다 — 목록은 단건 요청으로만 온다.
   * 요청을 한 번 더 쓰는 경로라 호출은 sync/dlc-list 가 빈도와 건수를 막아 준다.
   * 스냅샷에 dlcExternalIds 를 이미 채워 주는 소스는 이 메서드를 두지 않는다.
   */
  listDlcIds?(externalId: string): Promise<string[]>;
};

export type MetaAdapter = SourceAdapter<MetaSnapshot>;
export type NewsAdapter = SourceAdapter<NewsItem[]>;

export class AdapterError extends Error {
  constructor(message: string, public readonly source: Source, public readonly retryable = true) {
    super(message);
    this.name = "AdapterError";
  }
}
