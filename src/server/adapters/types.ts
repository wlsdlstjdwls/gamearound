// 어댑터 인터페이스 — 설계서 §4.1. 어댑터는 "가져오기만" 한다. DB 반영은 sync/가 맡음.
import type { Platform } from "@/server/db/schema";

export type Source = "steam" | "psstore" | "xbox" | "nintendo" | "hltb" | "opencritic" | "metacritic" | "rss";

export interface StoreSnapshot {
  platform: Platform;
  storeExternalId: string;
  storeUrl: string;
  listPrice: number | null;      // KRW
  currentPrice: number | null;
  discountPct: number | null;
  /** 할인 시작 시각 (ISO datetime). 주는 소스만 채움 — xbox */
  discountStartsAt?: string | null;
  /** 할인 종료 예정 시각 (ISO datetime). steam·xbox */
  discountEndsAt?: string | null;
  /** 행사명 ("여름 세일", "주말 특가" 등). steam 만 토큰 → 한국어 라벨 */
  discountName?: string | null;
  currentVersion?: string | null;
  releaseDate?: string | null;   // ISO date (YYYY-MM-DD)
  // Steam 기준 소스에서만 채워지는 게임 마스터 정보(신규 게임 생성용)
  meta?: {
    titleEn: string;
    titleKo?: string | null;
    description?: string | null;
    /** 가로 배너(460×215) — 카드·목록용 */
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
   * 카탈로그에서 신규 후보를 찾아온다 (지원하는 소스만). 이게 없으면 그 소스는
   * 이미 등록된 게임에 가격을 붙이기만 할 뿐, 그 플랫폼 독점작을 영원히 못 가져온다.
   */
  discover?(limit: number): Promise<SearchCandidate[]>;
  /** 소스별 요청 간격(ms). 크롤 대상은 보수적으로 */
  minIntervalMs: number;
}

export type StoreAdapter = SourceAdapter<StoreSnapshot>;
export type MetaAdapter = SourceAdapter<MetaSnapshot>;
export type NewsAdapter = SourceAdapter<NewsItem[]>;

/** 크롤러 공통 User-Agent (§10: UA 명시) */
export const CRAWLER_USER_AGENT =
  "SonjeondeungBot/0.1 (+https://github.com/sonjeondeung; game price aggregator; contact: admin@example.com)";

export class AdapterError extends Error {
  constructor(message: string, public readonly source: Source, public readonly retryable = true) {
    super(message);
    this.name = "AdapterError";
  }
}
