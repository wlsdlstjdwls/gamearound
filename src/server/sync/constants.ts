// 동기화 실행 상수 — 설계서 §4.4/§9/§10 의 수치를 한 곳에 모은다.
// 배치 크기·임계값은 운영하며 조정되는 값이라 로직 파일에 흩어져 있으면 근거(주석)를 잃는다.
import { RSS_FEEDS } from "@/server/adapters/news-rss";
import type { Source } from "@/server/adapters/types";
import type { StoreSource } from "@/server/adapters";
import type { Platform } from "@/server/db/schema";

export const LOCK_TTL_SEC = 3600;
export const RETRY_DELAYS_MS = [1000, 4000, 16000]; // 재시도 3회 지수 백오프
/** 수집 대상이 되는 매핑 상태. pending(검수 대기)·none(미매칭 기록)은 제외 */
export const MATCHED_FOR_SYNC = ["auto", "manual"] as const;
/** 소스별 배치 크기 (§4.4: 200~500, §9: 1회 5분 이내). 크롤 소스는 minIntervalMs × 배치가 워크플로 timeout 안에 들도록 */
export const BATCH_SIZE: Record<Source, number> = {
  // steam 은 fetchMany(100개/요청) 라 수집은 1,500건에 ~15초. 병목은 게임당 DB 왕복(실측 0.87초/건)이라
  // 1,500 ≈ 22분 으로 잡는다(하루 3회 = 4,500건/일). 이 값을 올리려면 반영 단계를 먼저 배치화해야 한다.
  steam: 1500, psstore: 200, xbox: 200, nintendo: 120,
  hltb: 200, opencritic: 300, metacritic: 150,
  rss: RSS_FEEDS.length,
};
/** fetchMany 는 있는데 batchSize 를 선언하지 않은 어댑터용 기본값 */
export const DEFAULT_FETCH_BATCH_SIZE = 50;
/** --seed-top 으로 카탈로그를 훑어 신규 게임을 등록할 수 있는 소스 (어댑터가 discover 를 갖거나 steam) */
export const SEEDABLE_SOURCES: Source[] = ["steam", "nintendo"];
/** 스토어 소스 → 담당 플랫폼 (§11-6: PS4/PS5, Switch/Switch2 분리 유지) */
export const SOURCE_PLATFORMS: Record<StoreSource, Platform[]> = {
  steam: ["steam"], psstore: ["ps5", "ps4"], xbox: ["xbox"], nintendo: ["switch", "switch2"],
};
/** §10 파싱 검증: 성공 건 중 가격 0/null 비율이 이 값을 넘으면 반영 생략 + partial */
export const SUSPICIOUS_PRICE_RATIO = 0.5;
export const SUSPICIOUS_MIN_SAMPLE = 10;
export const ERROR_SAMPLE_MAX = 3;
/** 뉴스 제목 매칭 시 너무 짧은 게임 제목은 제외 (오매칭 방지) */
export const NEWS_MATCH_MIN_TITLE_LEN = 4;
export const REVALIDATE_TIMEOUT_MS = 15_000;
