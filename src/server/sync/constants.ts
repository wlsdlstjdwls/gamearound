// 동기화 실행 상수 — 설계서 §4.4/§9/§10 의 수치를 한 곳에 모은다.
// 배치 크기, 임계값은 운영하며 조정되는 값이라 로직 파일에 흩어져 있으면 근거(주석)를 잃는다.
import { RSS_FEEDS } from "@/server/adapters/news-rss";
import { GAMEPASS_COLLECTIONS } from "@/server/adapters/gamepass";
import type { Source } from "@/server/adapters/types";
import type { StoreSource } from "@/server/adapters";
import type { Platform, Region } from "@/server/db/schema";

export const LOCK_TTL_SEC = 3600;
export const RETRY_DELAYS_MS = [1000, 4000, 16000]; // 재시도 3회 지수 백오프
/** 수집 대상이 되는 매핑 상태. pending(검수 대기), none(미매칭 기록)은 제외 */
export const MATCHED_FOR_SYNC = ["auto", "manual"] as const;
/** 소스별 배치 크기 (§4.4: 200~500, §9: 1회 5분 이내). 크롤 소스는 minIntervalMs × 배치가 워크플로 timeout 안에 들도록 */
export const BATCH_SIZE: Record<Source, number> = {
  // steam 은 fetchMany(100개/요청) 라 수집은 1,500건에 ~15초. 병목은 게임당 DB 왕복(실측 0.87초/건)이라
  // 1,500 ≈ 22분 으로 잡는다(하루 3회 = 4,500건/일). 이 값을 올리려면 반영 단계를 먼저 배치화해야 한다.
  steam: 1500, psstore: 200, xbox: 200,
  // 가격이 공식 API 배치(50건/요청)로 오면서 한국 eShop 도 4초 간격에 묶이지 않는다.
  // 남은 병목은 신규 등록 대상의 상품 HTML 뿐이다(batchPricesOnly "detail").
  nintendo: 300,
  // 일본은 HTML 이 아예 없다 — 발견도 가격도 JSON 이라 한국보다 크게 잡는다
  nintendo_jp: 600,
  // epic 은 단건 조회(catalogOffer) + 요청 간격 1초라 250건 ≈ 4분. 여기에 발견 한 바퀴(약 175요청 ≈ 3분)가 더 붙는다
  epic: 250,
  // gog 는 배치 조회(50개 ID 당 상품, 가격 2요청)라 수집은 빠르다. 발견 한 바퀴가 64페이지 ≈ 1분
  gog: 400,
  // hltb 는 간격이 4초에서 1초로 내려가며(어댑터 주석의 실측) 같은 시간에 3배를 볼 수 있게 됐다.
  // 건당 페이지 fetch 0.6초 + 반영 + 대기 1초 ≈ 2초 → 300건 ≈ 10분.
  hltb: 300, opencritic: 300, metacritic: 150,
  rss: RSS_FEEDS.length,
  // 위키데이터 공개 SPARQL 은 질의 1건이 수백 ms 에서 수 초다. 2초 간격 × 150 = 최대 ~7분.
  // 회사는 거의 안 바뀌므로 한 번에 다 훑을 필요가 없다 — lastSyncedAt 이 오래된 것부터 잘라 간다.
  wikidata: 150,
  // 위키데이터 게임 조회는 별칭 한 덩어리라 응답이 작다. 병목은 요청 간격 5초뿐이다
  // (회사 경로가 2초에서 429 를 맞고 올려 둔 값). 40건 ≈ 3.5분이라 다른 메타 소스와 함께 돌 수 있다.
  // 본편이 4,907건이라 한 바퀴에 며칠이 걸린다 — 별칭은 급한 값이 아니라 그걸 감수한다.
  wikidata_game: 40,
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
export const LOCAL_ONLY_SOURCES: Source[] = ["nintendo", "nintendo_jp", "epic"];
// 2026-09-14 이후 이 둘의 정규 실행처는 서울 리전 Vercel 크론이다(CRON_SOURCES).
// 이 목록과 scripts/crawl-local.ts 는 손으로 돌려야 할 때를 위해 남겨 둔다 — 크론이 막히거나
// 리전이 바뀌면 가정용 회선이 유일한 대비책이라, 쓰이지 않는다고 지우면 그때 다시 만들어야 한다.
/**
 * 로컬 크롤이 소스별로 넘길 --seed-top = 한 실행에서 새로 등록할 상한.
 * 실제 몫은 SEED_SHARE_MAX 가 한 번 더 깎는다(배치의 절반).
 */
export const LOCAL_SEED_TOP: Partial<Record<Source, number>> = {
  // eShop 은 요청 간격 4초라 한 번에 많이 못 당긴다 — 며칠에 걸쳐 채운다
  nintendo: 60,
  // BATCH_SIZE.epic(250)의 절반. 발견 페이지 예산은 DISCOVERY_PAGE_BUDGET.epic 이 따로 막는다
  epic: 125,
  // 일본은 발견도 가격도 JSON 이라 한국보다 크게 잡는다(BATCH_SIZE.nintendo_jp 의 절반)
  nintendo_jp: 300,
};

/**
 * 발견(신규 등록)을 **로컬에서** 도는 스토어와 그 몫.
 *
 * 왜 로컬인가: 신규 등록은 일회성 폭증이다. 카탈로그를 한 번 채우고 나면 신규는 출시작 몇 건/일로
 * 떨어진다. 그 일회성 비용을 유한한 Actions 분(무료 월 2,000분)으로 때우면, 정작 매일 되풀이되는
 * 할인 추적이 한도에 밀린다 — 2026-09-15 실측으로 crawl-prices 시간의 절반에서 77%가 신규 등록이었다
 * (steam 750/1,497, psstore 150/194, xbox 100/100). 가정용 회선은 시간이 공짜라 여기가 제자리다.
 * LOCAL_ONLY_SOURCES 와 다른 목록인 이유: 저쪽은 "러너 IP 로 막혀서" 로컬이고, 이쪽은 "분이 아까워서" 다.
 *
 * limit 을 따로 두는 이유: 시드 몫은 seedQuota 가 limit × 몫으로 한 번 더 깎는다.
 * seedTop 만 올리면 그 곱이 막아 아무 일도 안 일어난다([[ps-subscription-coverage]] 에서 겪은 함정).
 * limit 을 비우면 BATCH_SIZE 기본값을 쓴다.
 */
export const LOCAL_SEED_SOURCES: Source[] = ["steam", "psstore", "xbox", "gog"];
export const LOCAL_SEED_PLAN: Partial<Record<Source, { seedTop: number; limit?: number }>> = {
  // BATCH_SIZE.steam 1,500 의 절반 = SEED_SHARE_MAX 가 주는 최대치. 배치 조회라 건당 0.39초로 싸다
  steam: { seedTop: 750 },
  // psstore 는 fetchMany 가 없어 건당 요청 1회(실측 2.26초)라 제일 비싸다. 그래도 카탈로그가
  // 7,571건인데 587건만 알아서 제일 급하다 — 분 걱정이 없는 로컬에서 400건까지 올려 잡는다(약 15분).
  psstore: { seedTop: 300, limit: 400 },
  // KR 카탈로그 16,991건. 몫의 절반이 시드라 limit 300 이면 신규 150건이다
  xbox: { seedTop: 150, limit: 300 },
  // 카탈로그 한 바퀴가 64페이지라 이미 거의 다 안다. 기본 배치로 충분하다
  gog: { seedTop: 200 },
};

/**
 * Vercel 크론이 맡는 소스. 러너 IP 로는 못 도는 두 소스만 서울 리전 함수로 뗀다 —
 * 그 리전은 한국 IP 로 나가서 둘 다 열린다(2026-09-14 /api/debug/reachability 실측:
 * nintendo 200, epic 은 curl 전송기로 200, 출구 IP 43.201.77.62).
 * 나머지 소스는 Actions 에 남는다: steam 배치 1,500건은 함수 300초 안에 안 들어오고,
 * Actions 무료 한도(월 2,000분)에 맞춘 주기가 이미 잡혀 있다.
 */
export const CRON_SOURCES = ["nintendo", "nintendo_jp", "epic"] as const;
// 주기는 vercel.json 의 crons 에 있다 — JSON 이라 주석을 못 달아 근거를 여기 적는다(시각은 UTC).
//   /api/cron/crawl/nintendo/prices       15 */6 * * *          하루 4회 × 300건 = 1,200건/일
//   /api/cron/crawl/nintendo/discover     45 1,7,13,19 * * *    하루 4회 × 20건 = 80건/일 (신규는 상품 HTML 이라 4초 간격을 탄다)
//   /api/cron/crawl/nintendo_jp/prices    35 */6 * * *          하루 4회 × 300건 = 1,200건/일
//   /api/cron/crawl/nintendo_jp/discover  5 2,8,14,20 * * *     하루 4회 × 60건 = 240건/일 (한 바퀴가 약 300페이지)
//   /api/cron/crawl/epic/prices           25 */6 * * *          하루 4회 × 110건 = 440건/일 (DLC 몫을 떼며 120에서 내렸다)
//   /api/cron/crawl/epic/discover         55 3,9,15,21 * * *    하루 4회 × 60건 = 240건/일 (한 바퀴가 175페이지)
// 가격 갱신 주기를 발견보다 성기게 두는 이유(2026-09-14): 카탈로그가 비어 있는 단계에서는
// 같은 몇십 건을 하루에 열두 번 다시 묻는 것보다 새 게임을 들이는 쪽이 낫다. 보유가 갱신 몫을
// 따라잡으면(닌텐도 168건, Epic 520건) 그때 prices 주기를 다시 촘촘하게 한다.
// 분을 0 으로 두지 않는 이유: Vercel 크론은 정각에 몰리고, 몰리면 실행이 뒤로 밀린다.
export type CronSource = (typeof CRON_SOURCES)[number];
/** 크론 1회가 하는 일. 한 번에 다 하면 300초를 넘겨서 갈라 둔다 */
export const CRON_MODES = ["prices", "discover"] as const;
export type CronMode = (typeof CRON_MODES)[number];

export interface CronRunPlan {
  /** 이번 실행의 총 처리 건수 상한. 실행 시간은 이 값이 정한다 */
  limit: number;
  /** 새로 등록할 상한. 0 이면 발견을 아예 돌지 않는다. limit 안에서 자리만 차지하므로 시간은 안 는다 */
  seedTop: number;
  /** 발견이 읽을 목록 페이지 수 상한 */
  pageBudget: number;
  /** 수집 전에 제목으로 매칭해 볼 미매칭 게임 수. 검색도 요청이라 이 자리에선 적게 */
  match: number;
  /**
   * 시드가 배치에서 가져갈 몫의 비율. 비우면 SEED_SHARE_MAX(절반).
   * discover 모드는 1 을 준다 — 여기서 절반을 기존 가격 갱신에 묶어 두면
   * 그 절반이 prices 모드가 이미 하는 일과 겹친다.
   */
  seedShare?: number;
}

/**
 * 소스별, 모드별 실행 몫. **요청 간격에서 역산한 값이다** — 함수 제한 300초에서
 * 반영(DB 왕복)과 알림, 캐시 무효화 몫으로 100초쯤을 남기고 200초 안쪽으로 잡는다.
 * 간격은 어댑터의 minIntervalMs 가 근거다: nintendo 4초, epic 1초.
 * 값을 올리려면 먼저 실제 실행 시간을 재고(응답의 durationMs) 올린다.
 *
 * CRON_TIME_BUDGET_MS 는 "요청에 쓸 수 있는 시간" 이고, 각 몫이 이 안에 드는지는
 * cron-plan.test 가 지킨다 — 몫을 손으로 올릴 때 300초를 넘기는 실수를 테스트가 먼저 잡는다.
 */
export const CRON_TIME_BUDGET_MS = 200_000;

/**
 * 항목 1건을 반영하는 데 드는 시간(요청 시간 제외) — DB 왕복, 알림, 캐시 무효화 몫.
 *
 * 처음에는 "요청 시간 × 소스별 보정 계수" 로 어림했는데, 가격을 배치로 받는 소스가 생기면서 그 모양이 깨졌다:
 * 50건을 한 요청에 받으면 요청 시간이 거의 0 이 되고, 그때 남는 것은 건당 DB 시간뿐이다.
 * 그래서 요청 시간과 반영 시간을 갈라 놓는다.
 *
 * 400ms 의 근거는 배포된 함수 실측 두 건이다(2026-09-14). 둘 다 건당 요청이 1회라 빼면 반영 몫만 남는다:
 *   epic prices     180건 250.5초 - 요청 180초 = 70.5초 → 건당 392ms
 *   nintendo prices  20건  87.8초 - 요청  80초 =  7.8초 → 건당 390ms
 * 소스가 달라도 같은 값이 나왔다 — 반영 경로(store-apply)가 소스와 무관하게 같기 때문이다.
 */
export const CRON_DB_MS_PER_ITEM = 400;
/** 위 둘을 더한 값에 곱할 여유. 실행 시간은 들쭉날쭉하고, 잘리면 그 실행이 통째로 버려진다 */
export const CRON_SAFETY_FACTOR = 1.15;

export const CRON_PLAN: Record<CronSource, Record<CronMode, CronRunPlan>> = {
  nintendo: {
    // 가격이 배치 50건/요청이라 요청은 6회(24초)뿐이고 남는 건 반영 시간이다: (24 + 300×0.4)×1.15 = 166초
    prices: { limit: 300, seedTop: 0, pageBudget: 0, match: 0 },
    // 신규 20건은 상품 HTML 단건 조회다(batchPricesOnly "detail") — 여기만 4초 간격을 그대로 탄다.
    // 요청 (12페이지 + 매칭 3 + 신규 20) × 4초 = 140초, 반영 24건 × 0.4초 → 합 172초
    discover: { limit: 24, seedTop: 20, pageBudget: 12, match: 3, seedShare: 1 },
  },
  nintendo_jp: {
    // 발견도 가격도 JSON 이라 한국보다 싸다. 요청 6회(6초) + 반영 300건 × 0.4초 → 145초
    prices: { limit: 300, seedTop: 0, pageBudget: 0, match: 0 },
    // 단건 조회 경로가 없어 신규도 요청을 더 쓰지 않는다(발견 목록이 마스터까지 준다).
    // 페이지 예산을 2026-09-15 에 100 에서 90 으로 내렸다. 100 은 카탈로그가 포화됐을 때의
    // 최악값인데 JP 는 아직 14,882건 중 236건만 안다 — 실측 발견은 6페이지에서 stoppedBy "want" 로
    // 멈춘다(300건 훑어 신규 60건). 안 쓰는 최악값이 예산에서 10초를 떼어 가고 있었다.
    // 요청 (90페이지 + 배치 2 + 매칭 8 + DLC 목록 30 + DLC 상세 1) × 1초 + 반영 80건 × 0.4초 → 163초
    discover: { limit: 60, seedTop: 60, pageBudget: 90, match: 8, seedShare: 1 },
  },
  epic: {
    // 2026-09-15 에 120 에서 110 으로 내렸다 — DLC 목록 3회와 새 DLC 상세 10건이 이 모드에 새로 붙었다.
    // 요청 (110 + 3 + 10) × 1초 + 반영 (110 + 10)건 × 0.4초 → 197초. 첫 실측(180건)이 250초라 보수적으로 잡는다
    prices: { limit: 110, seedTop: 0, pageBudget: 0, match: 0 },
    // 요청 (60페이지 + 60건 + 매칭 8) × 1초 + 반영 60건 × 0.4초 → 175초. 한 바퀴가 175페이지라 나눠 돈다
    // 60건 전부를 신규에 준다. Epic 기존 가격은 prices 모드가 따로 돈다
    discover: { limit: 60, seedTop: 60, pageBudget: 60, match: 8, seedShare: 1 },
  },
};

/** --seed-top 으로 카탈로그를 훑어 신규 게임을 등록할 수 있는 소스 (어댑터가 discoverPages 를 가진 소스) */
export const SEEDABLE_SOURCES: Source[] = ["steam", "psstore", "xbox", "nintendo", "nintendo_jp", "epic", "gog"];
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
  // 1초 × 60 ≈ 1분. 스위치 본편, 판매 중으로 좁힌 14,882건이 페이지당 50건이라 한 바퀴가 약 300페이지
  nintendo_jp: 60,
  // 1초 × 90 ≈ 1.5분. 서버가 페이지를 24건으로 깎아 KR 7,571건이 316페이지다
  psstore: 90,
};
/**
 * 신규 시드가 한 배치에서 가져갈 수 있는 몫의 상한. 시드는 대상 목록 맨 앞에 붙으므로
 * 상한이 없으면 카탈로그가 비어 있는 초기에 시드가 배치를 통째로 먹고 기존 게임 가격이 안 갱신된다.
 * 0.5 = 신규 유입과 기존 갱신을 반씩. Steam 기준 실행당 750건 신규 = 하루 2,250건.
 */
export const SEED_SHARE_MAX = 0.5;
/**
 * 소스별 몫 덮어쓰기. 카탈로그의 대부분을 아직 모르는 소스는 절반이 너무 후하다 —
 * 아는 것이 적으면 그 적은 것을 하루 세 번 다시 묻는 데 배치의 절반이 나간다.
 *
 * psstore 0.75 의 근거(2026-09-14 실측): 매핑된 게임이 155건인데 KR 카탈로그는 7,571건이다.
 * 155건은 전부 2일 안에 갱신돼 있어(game_platforms.last_synced_at) 재조회 몫이 남아돌고,
 * 발견은 `stoppedBy: "want"` 로 멈춘다 — 더 찾을 게 있는데 몫이 없어 멈춘다는 뜻이다.
 * 0.75 로 올리면 실행당 신규가 100건에서 150건이 되고(하루 450건), 남는 50건이 155건을 하루 한 바퀴 돌린다.
 * 배치 크기는 그대로라 실행 시간도, Actions 사용 분도 늘지 않는다.
 *
 * 2026-09-15 확인: 먹히고 있다 — 매핑이 155건에서 587건으로 늘었다(실행당 신규 150건이 그대로 찬다,
 * 마지막 실행 discovery fresh 150, pages 20, stoppedBy "want"). 남은 약 7,000건은 이 속도면 2주쯤이다.
 * **여기서 더 올리지 않는다.** 남은 손잡이는 배치 크기인데 그건 Actions 분을 그대로 먹는다 —
 * psstore 단계는 200건에 737초로 이미 이 워크플로에서 제일 비싼 단계다(crawl-prices.yml 주석의 실측).
 * 보유가 카탈로그를 따라잡으면 이 줄을 지워 기본값(절반)으로 되돌린다.
 */
export const SEED_SHARE_BY_SOURCE: Partial<Record<StoreSource, number>> = {
  psstore: 0.75,
};
/** 스토어 소스 → 담당 플랫폼 (§11-6: PS4/PS5, Switch/Switch2 분리 유지) */
export const SOURCE_PLATFORMS: Record<StoreSource, Platform[]> = {
  steam: ["steam"], psstore: ["ps5", "ps4"], xbox: ["xbox"], nintendo: ["switch", "switch2"],
  nintendo_jp: ["switch", "switch2"], epic: ["epic"], gog: ["gog"],
};
/**
 * 소스가 파는 나라. 같은 기기라도 나라가 다르면 game_platforms 행이 따로다 —
 * 그래서 "이 소스의 행" 을 고를 때는 플랫폼만으로 부족하고 이 값이 함께 조건에 들어가야 한다.
 * 안 그러면 일본 수집이 한국 행을 덮어쓴다.
 */
export const SOURCE_REGION: Record<StoreSource, Region> = {
  steam: "KR", psstore: "KR", xbox: "KR", nintendo: "KR", nintendo_jp: "JP", epic: "KR", gog: "KR",
};
/** §10 파싱 검증: 성공 건 중 가격 0/null 비율이 이 값을 넘으면 반영 생략 + partial */
export const SUSPICIOUS_PRICE_RATIO = 0.5;
export const SUSPICIOUS_MIN_SAMPLE = 10;
export const ERROR_SAMPLE_MAX = 3;
/** 뉴스 제목 매칭 시 너무 짧은 게임 제목은 제외 (오매칭 방지) */
export const NEWS_MATCH_MIN_TITLE_LEN = 4;
export const REVALIDATE_TIMEOUT_MS = 15_000;

/**
 * 한 게임에 붙일 자동 별칭 수 상한. 위키데이터 altLabel 은 한 항목에 수십 개가 달리는 일이 있다
 * (오표기, 부제 변형, 개발 코드명). 그걸 다 넣으면 검색 EXISTS 가 훑을 행만 늘고 정확도는 안 는다.
 * 시리즈 1~2, 원작 1~2, 약칭 몇 개면 연관검색어로 충분하다.
 */
export const ALIAS_PER_GAME_MAX = 12;

/**
 * 한 게임에서 따라 들여올 DLC 수 상한. 심즈류는 DLC 가 수십 개라 상한이 없으면
 * 그 한 게임이 배치를 다 먹는다. 초과분은 recordError 로 표본만 남기고 건너뛴다.
 */
export const DLC_PER_GAME_MAX = 30;

/**
 * 한 실행에서 본편 DLC 목록(steam appdetails)을 새로 물어볼 건수.
 * appdetails 는 배치가 없는 단건 경로라 요청 1회가 게임 1개다. 요청 간격 1.5초 × 60 ≈ 90초로,
 * 수집 본체(배치 100개/요청)를 눈에 띄게 늦추지 않는 선에서 잡았다.
 * 값을 크게 올릴 거면 appdetails 의 과요청 차단(429)부터 실측한다.
 */
export const DLC_LIST_PER_RUN = 60;

/**
 * 소스별 상한. 응답 크기가 소스마다 자릿수로 다르다 — 하나의 숫자로는 둘 다 맞출 수 없다.
 *   steam  appdetails JSON, 건당 ~100KB
 *   xbox   스토어 페이지 HTML, 건당 ~900KB (2026-09-14 실측: 철권 8 페이지 932KB)
 *   gog    목록이 상품 응답 안에 이미 들어 있어 이 경로를 쓰지 않는다
 * xbox 를 20 으로 잡은 근거: 20 × 900KB ≈ 18MB, 요청 간격 1초로 ~20초. 스팀과 비슷한 시간, 비슷한 바이트다.
 * 카탈로그를 한 바퀴 도는 데 그만큼 오래 걸리지만, 새 DLC 는 급한 정보가 아니다.
 */
export const DLC_LIST_PER_RUN_BY_SOURCE: Partial<Record<Source, number>> = {
  xbox: 20,
  // epic 은 목록이 GraphQL 1회라 싸지만(HTML 을 안 읽는다), 그 결과로 받을 DLC 상세가 비싸다.
  // 이 값이 곧 DLC_FETCH_PER_RUN_BY_SOURCE.epic 을 채우는 속도라 3 이면 충분하다 — 크론은 6시간마다 돈다.
  epic: 3,
  // psstore 도 스토어 페이지 HTML 이다 — 건당 0.6~1.2MB(2026-09-15 실측: DEATHLOOP 713KB, 철권 8 1.03MB).
  // 그런데 xbox 보다 낮게 잡는 이유는 페이지 크기가 아니라 **그다음 단계**다:
  // psstore 에는 fetchMany 가 없어 새 DLC 한 건이 요청 한 번이다(xbox, steam 은 배치라 거의 공짜다).
  // 목록만 보면 10건 × 1초 = 10초지만, 최악(한 본편이 상한 DLC_PER_GAME_MAX 30건을 다 채움)에는
  // 등록에 10 × 30 = 300요청 ≈ 5분이 더 붙는다. 실측 표본은 대체로 그보다 훨씬 적다
  // (2026-09-15: 엘든 링 2, 사이버펑크 3, FF16 3, 철권 8 24, 몬헌 와일즈 48건이 상한에 걸려 30).
  // 첫 몇 바퀴만 비싸고 그 뒤로는 이미 아는 DLC 가 걸러져 거의 빈손이다.
  psstore: 10,
  // nintendo_jp 는 목록이 검색 JSON 1회라 가장 싸다(건당 수십 KB). 상한을 정하는 것은
  // 응답 크기가 아니라 크론 예산이다 — discover 모드가 이미 100페이지를 읽어 남는 자리가 적다.
  //
  // 2026-09-15 에 20 에서 30 으로 올렸다. 20 은 "JP 본편이 100건 남짓" 이라는 전제로 잡은 값인데
  // 그 전제가 깨졌다(실측: 작품 코드가 있는 본편 행 200건, 그중 물어본 행 40건).
  // 발견이 질문보다 빠른 것이 원인이다 — discover 1회가 JP 행을 약 58건 늘려 하루 232건인데,
  // 질문은 20 × 하루 8회(prices 4 + discover 4) = 160건이라 하루 70건씩 미질문이 쌓였다.
  // 30 이면 240건/일이라 발견 속도를 앞선다. 예산은 cron-plan.test 가 두 모드를 다 센다.
  nintendo_jp: 30,
};
/**
 * 한 실행에서 **새로 등록할** DLC 수 상한. 비우면 상한 없음.
 *
 * 목록을 받는 값(DLC_LIST_PER_RUN_BY_SOURCE)과 다른 축이다. 목록은 본편당 요청 1회지만,
 * 거기서 나온 새 DLC 는 각각 상세를 받아야 게임 레코드가 된다. 배치 조회가 있는 소스(steam, xbox, gog)는
 * 그 상세가 50건에 요청 1회라 사실상 공짜여서 상한이 필요 없었는데, **fetchMany 가 없는 소스**
 * (epic, psstore)는 새 DLC 한 건이 요청 한 번이다 — 본편 몇 개만 DLC 부자여도 실행이 몇 분씩 길어진다.
 *
 * epic 10 의 근거: epic 은 Vercel 크론(함수 300초)에서 돌고 CRON_PLAN 이 이미 예산을 거의 다 쓴다.
 * DLC 는 요청 시간(건당 1초)만 먹는 게 아니라 반영 시간(CRON_DB_MS_PER_ITEM)도 같이 먹는다 —
 * 손으로 계산할 때 그 절반을 빠뜨리기 쉬워서 cron-plan.test 가 두 축을 다 세도록 해 뒀다.
 * 10건 + 목록 3회를 떼고 prices limit 을 120 에서 110 으로 내리면 두 모드가 다 예산 안에 든다
 * (prices 197초, discover 194초). discover 몫은 건드리지 않아도 됐다.
 * psstore 60 은 Actions(timeout 60분)라 덜 빡빡하지만, 한 실행이 DLC 로 10분씩 길어지는 것은 막는다.
 *
 * 상한에 걸려 이번에 못 받은 DLC 는 그 본편의 dlc_listed_at 이 이미 찍혀 있어
 * DLC_LIST_REFRESH_DAYS 뒤에야 다시 걸린다. 새 DLC 가 며칠 늦게 잡히는 것은 손해가 아니라는
 * 이 경로의 전제(dlc-list 주석)를 그대로 따른다 — 대신 그 대가를 여기 적어 둔다.
 */
export const DLC_FETCH_PER_RUN_BY_SOURCE: Partial<Record<Source, number>> = {
  epic: 10,
  psstore: 60,
  // nintendo_jp 는 가격이 배치 50건/요청이라 요청 시간은 거의 안 든다 — 드는 것은 반영 시간뿐이다.
  // 2026-09-15 에 40 에서 20 으로 내렸다. 40 은 한 번도 안 닿은 값이다(실측: 본편 40건을 물어
  // 등록된 JP DLC 가 8건). 닿지도 않는 상한이 예산에서 16초를 미리 떼어 가고 있었고,
  // 그 자리를 DLC_LIST_PER_RUN_BY_SOURCE.nintendo_jp 를 30 으로 올리는 데 썼다 —
  // JP 에서 급한 쪽은 "본편 하나가 DLC 부자인 경우" 가 아니라 "아직 안 물어본 본편" 이다.
  nintendo_jp: 20,
};

/**
 * 한 실행에서 패치 기록을 새로 물어볼 게임 수.
 *
 * DLC 목록과 같은 성격의 경로다 — 배치가 없어 게임 1개가 요청 1회다(steam ISteamNews, gog changelog).
 * 그래서 한도의 근거도 같은 자리에서 온다: **Actions 사용 분**이다.
 *   steam 30건 × 요청 간격 1.5초 = 45초
 *   gog   20건 × 요청 간격 1.0초 = 20초
 * 합쳐 실행당 65초, 하루 3회(crawl-prices 의 cron) = 월 약 98분이다.
 *
 * crawl-prices 는 이미 1회 33분, 월 3,000분으로 무료 한도(2,000분)를 넘고 있다(워크플로 주석의 실측).
 * 이 단계는 그 위에 3%를 더한다 — 여기서 더 올리기 전에 **먼저 볼 것은 33분 쪽**이다.
 * 그 33분의 절반 이상이 신규 등록이라 LOCAL_SEED_SOURCES 가 그걸 덜어내는 중이고, 한도가 풀리면
 * 이 값도 같이 올린다. 카탈로그를 한 바퀴 도는 속도는 이 값이 정한다(하루 90건).
 */
export const PATCH_LIST_PER_RUN = 30;
/**
 * 소스별 상한. gog 는 요청 간격이 1초로 더 싸지만 **응답이 크다** —
 * expand=changelog 는 게임당 수십에서 수백 KB 다(2026-09-15 실측: 사이버펑크 2077 244KB,
 * 위쳐 3 8.5KB, 위쳐 1 841B). 20건이면 최악이라도 5MB 안쪽이고 20초에 끝난다.
 * 시간이 아니라 바이트가 한도를 정하는 유일한 소스라 따로 적는다.
 */
export const PATCH_LIST_PER_RUN_BY_SOURCE: Partial<Record<Source, number>> = {
  gog: 20,
};
/**
 * 한 번 물어본 게임을 다시 물어보기까지의 간격(일).
 *
 * DLC(30일)보다 짧게 잡는 이유: 새 DLC 는 몇 달에 한 번이지만 패치는 주 단위로 나온다.
 * 그렇다고 아주 짧게 잡아도 소용이 없다 — 아직 한 번도 안 물어본 게임이 늘 먼저라(pickPatchListTargets)
 * 카탈로그가 한 바퀴 돌기 전에는 이 값이 실제로 쓰이지 않는다. 그때를 위한 값이다.
 */
export const PATCH_LIST_REFRESH_DAYS = 14;
/**
 * 한 게임에서 담을 패치 기록 수 상한. 오래 서비스한 게임은 기록이 수백 건이다
 * (2026-09-15 실측: CS2 251건, 사이버펑크 2077 변경 기록 제목 수백 개).
 * 화면이 대답하는 질문은 "얼마나 자주 고치나" 라서 최근 것 몇십 건이면 충분하다.
 */
export const PATCH_PER_GAME_MAX = 50;

/**
 * 한 번 물어본 본편을 다시 물어보기까지의 간격(일).
 * 새 DLC 는 드물게 나오고, 나온 뒤 며칠 늦게 잡혀도 손해가 없다. 짧게 잡으면 이 경로가
 * 카탈로그를 한 바퀴 도는 속도만 느려진다 — 아직 한 번도 안 물어본 본편이 늘 먼저다.
 */
export const DLC_LIST_REFRESH_DAYS = 30;

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
