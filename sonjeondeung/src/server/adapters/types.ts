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
  currentVersion?: string | null;
  releaseDate?: string | null;   // ISO date (YYYY-MM-DD)
  // Steam 기준 소스에서만 채워지는 게임 마스터 정보(신규 게임 생성용)
  meta?: {
    titleEn: string;
    titleKo?: string | null;
    description?: string | null;
    coverUrl?: string | null;
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
