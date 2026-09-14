// 동기화 실행 상수 — 설계서 §4.4/§9/§10 의 수치를 한 곳에 모은다.
// 배치 크기, 임계값은 운영하며 조정되는 값이라 로직 파일에 흩어져 있으면 근거(주석)를 잃는다.
import { RSS_FEEDS } from "@/server/adapters/news-rss";
import { GAMEPASS_COLLECTIONS } from "@/server/adapters/gamepass";
import type { Source } from "@/server/adapters/types";
import type { StoreSource } from "@/server/adapters";
import type { Platform } from "@/server/db/schema";

export const LOCK_TTL_SEC = 3600;
export const RETRY_DELAYS_MS = [1000, 4000, 16000]; // 재시도 3회 지수 백오프
/** 수집 대상이 되는 매핑 상태. pending(검수 대기), none(미매칭 기록)은 제외 */
export const MATCHED_FOR_SYNC = ["auto", "manual"] as const;
/** 소스별 배치 크기 (§4.4: 200~500, §9: 1회 5분 이내). 크롤 소스는 minIntervalMs × 배치가 워크플로 timeout 안에 들도록 */
export const BATCH_SIZE: Record<Source, number> = {
  // steam 은 fetchMany(100개/요청) 라 수집은 1,500건에 ~15초. 병목은 게임당 DB 왕복(실측 0.87초/건)이라
  // 1,500 ≈ 22분 으로 잡는다(하루 3회 = 4,500건/일). 이 값을 올리려면 반영 단계를 먼저 배치화해야 한다.
  steam: 1500, psstore: 200, xbox: 200, nintendo: 120,
  // epic 은 단건 조회(catalogOffer) + 요청 간격 1초라 250건 ≈ 4분. 여기에 발견 한 바퀴(약 175요청 ≈ 3분)가 더 붙는다
  epic: 250,
  // gog 는 배치 조회(50개 ID 당 상품, 가격 2요청)라 수집은 빠르다. 발견 한 바퀴가 64페이지 ≈ 1분
  gog: 400,
  hltb: 200, opencritic: 300, metacritic: 150,
  rss: RSS_FEEDS.length,
  // 위키데이터 공개 SPARQL 은 질의 1건이 수백 ms 에서 수 초다. 2초 간격 × 150 = 최대 ~7분.
  // 회사는 거의 안 바뀌므로 한 번에 다 훑을 필요가 없다 — lastSyncedAt 이 오래된 것부터 잘라 간다.
  wikidata: 150,
  // 컬렉션 수만큼만 요청한다. 배치 개념이 없어 형식상의 값이다
  gamepass: Object.keys(GAMEPASS_COLLECTIONS).length,
};
/** fetchMany 는 있는데 batchSize 를 선언하지 않은 어댑터용 기본값 */
export const DEFAULT_FETCH_BATCH_SIZE = 50;

/**
 * 반영 단계에서 한 번에 묶어 보낼 SQL 문장 수.
 * Neon HTTP 는 왕복 1회가 200~350ms 라 문장을 묶을수록 이득이지만, 한 묶음이 실패하면
 * 그 묶음을 한 문장씩 다시 보내야 해서 너무 크면 재시도 비용이 커진다.
 * 50 은 실측(2026-09-14)에서 왕복이 20문장부터 거의 평평해지는 구간이다.
 */
export const WRITE_BATCH_SIZE = 50;
/**
 * 러너의 IP 로는 못 도는 소스. 스토어가 데이터센터, 해외 IP 를 막는다(2026-09-14 실측):
 *   nintendo — 한국 eShop 이 한국 밖 IP 에 202 + 빈 본문을 준다
 *   epic — Cloudflare 가 데이터센터 IP 를 막는다(curl 로도 403). Node 의 TLS 지문도 막혀 curl 전송기를 쓴다
 * 가정용 회선에서 도는 로컬 크롤(scripts/crawl-local.ts)이 이 둘을 맡는다.
 * CRAWL_PROXY_URL(주거용 한국 출구)이 있으면 두 어댑터가 그 프록시로 나가므로 러너에서도 돈다
 * — 그때는 이 목록이 "프록시가 없을 때의 대비책" 이 된다(adapters/http 의 viaProxy).
 */
export const LOCAL_ONLY_SOURCES: Source[] = ["nintendo", "epic"];
/**
 * 로컬 크롤이 소스별로 넘길 --seed-top = 한 실행에서 새로 등록할 상한.
 * 실제 몫은 SEED_SHARE_MAX 가 한 번 더 깎는다(배치의 절반).
 */
export const LOCAL_SEED_TOP: Partial<Record<Source, number>> = {
  // eShop 은 요청 간격 4초라 한 번에 많이 못 당긴다 — 며칠에 걸쳐 채운다
  nintendo: 60,
  // BATCH_SIZE.epic(250)의 절반. 발견 페이지 예산은 DISCOVERY_PAGE_BUDGET.epic 이 따로 막는다
  epic: 125,
};

/** --seed-top 으로 카탈로그를 훑어 신규 게임을 등록할 수 있는 소스 (어댑터가 discoverPages 를 가진 소스) */
export const SEEDABLE_SOURCES: Source[] = ["steam", "psstore", "xbox", "nintendo", "epic", "gog"];
/**
 * 한 실행에서 목록 페이지를 몇 장까지 읽을지. 발견은 아는 것이 나오는 앞부분을 건너뛰며 파고들기 때문에
 * (sync/discover) 카탈로그가 커질수록 건너뛸 페이지가 늘어난다. 그렇다고 무한정 읽으면
 * 정작 가격 수집 시간을 잡아먹으므로, 요청 간격 × 이 값이 몇 분 안에 끝나도록 잡는다.
 */
export const DISCOVERY_PAGE_BUDGET: Partial<Record<StoreSource, number>> = {
  // 1.5초 × 80 ≈ 2분. 페이지당 100건이라 이미 아는 8,000건 구간을 건너뛰고도 신규를 만난다
  steam: 80,
  // KR 카탈로그 전체가 64페이지(100건/page) — 한 바퀴를 다 돌 수 있는 값에 여유를 더했다
  gog: 70,
  // 4초 × 25 ≈ 100초. 검색 결과가 페이지당 24건이라 한 실행에 600건까지 훑는다
  nintendo: 25,
  // 1초 × 200 ≈ 3.5분. 카탈로그 한 바퀴가 약 175페이지(40건/page)
  epic: 200,
  // 1.5초 × 60 ≈ 90초. KR 16,991건이 페이지당 43~48건이라 한 바퀴는 340페이지 — 며칠에 걸쳐 채운다
  xbox: 60,
  // 1초 × 90 ≈ 1.5분. 서버가 페이지를 24건으로 깎아 KR 7,571건이 316페이지다
  psstore: 90,
};
/**
 * 신규 시드가 한 배치에서 가져갈 수 있는 몫의 상한. 시드는 대상 목록 맨 앞에 붙으므로
 * 상한이 없으면 카탈로그가 비어 있는 초기에 시드가 배치를 통째로 먹고 기존 게임 가격이 안 갱신된다.
 * 0.5 = 신규 유입과 기존 갱신을 반씩. Steam 기준 실행당 750건 신규 = 하루 2,250건.
 */
export const SEED_SHARE_MAX = 0.5;
/** 스토어 소스 → 담당 플랫폼 (§11-6: PS4/PS5, Switch/Switch2 분리 유지) */
export const SOURCE_PLATFORMS: Record<StoreSource, Platform[]> = {
  steam: ["steam"], psstore: ["ps5", "ps4"], xbox: ["xbox"], nintendo: ["switch", "switch2"], epic: ["epic"], gog: ["gog"],
};
/** §10 파싱 검증: 성공 건 중 가격 0/null 비율이 이 값을 넘으면 반영 생략 + partial */
export const SUSPICIOUS_PRICE_RATIO = 0.5;
export const SUSPICIOUS_MIN_SAMPLE = 10;
export const ERROR_SAMPLE_MAX = 3;
/** 뉴스 제목 매칭 시 너무 짧은 게임 제목은 제외 (오매칭 방지) */
export const NEWS_MATCH_MIN_TITLE_LEN = 4;
export const REVALIDATE_TIMEOUT_MS = 15_000;

/**
 * 한 게임에서 따라 들여올 DLC 수 상한. 심즈류는 DLC 가 수십 개라 상한이 없으면
 * 그 한 게임이 배치를 다 먹는다. 초과분은 recordError 로 표본만 남기고 건너뛴다.
 */
export const DLC_PER_GAME_MAX = 30;

/**
 * 구독 카탈로그를 반영할 최소 크기. 이보다 적게 오면 수집 실패로 보고 아무것도 지우지 않는다.
 * 실측(2026-09-14) 콘솔 컬렉션이 수백 건이라 100 이면 정상 응답과 사고를 충분히 가른다.
 */
export const SUBSCRIPTION_MIN_CATALOG_SIZE = 100;

/**
 * 회사 정보 재조회 주기. 설립일, 국가는 사실상 안 바뀌므로 길게 잡는다 —
 * 짧게 잡으면 위키데이터에 예의 없는 트래픽만 만든다.
 */
export const COMPANY_REFRESH_DAYS = 90;
