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
  // xbox 800(2026-10-02, 200 에서): 레포가 공개로 바뀌어 Actions 분 제한이 없다. 백업 회차에서 더 많이 덮는다.
  // 실측 200건 66~87초라 800건이면 약 6분이다. 정규 실행처는 서울 크론(CRON_PLAN.xbox.prices)이다.
  steam: 1500, psstore: 200, xbox: 800,
  // 가격이 공식 API 배치(50건/요청)로 오면서 한국 eShop 도 4초 간격에 묶이지 않는다.
  // 남은 병목은 신규 등록 대상의 상품 HTML 뿐이다(batchPricesOnly "detail").
  nintendo: 300,
  // 일본은 HTML 이 아예 없다 — 발견도 가격도 JSON 이라 한국보다 크게 잡는다
  nintendo_jp: 600,
  // epic 은 단건 조회(catalogOffer) + 요청 간격 1초라 250건 ≈ 4분. 여기에 발견 한 바퀴(약 175요청 ≈ 3분)가 더 붙는다
  epic: 250,
  // hltb 는 간격이 4초에서 1초로 내려가며(어댑터 주석의 실측) 같은 시간에 3배를 볼 수 있게 됐다.
  // 건당 페이지 fetch 0.6초 + 반영 + 대기 1초 ≈ 2초 → 300건 ≈ 10분.
  hltb: 300,
  // opencritic 무료 등급은 하루 200요청이다(2026-09-16 헤더 실측). 매칭이 쓸 25를 빼면 175가 남고,
  // 격일 실행이라 한 회차가 곧 하루치다. 여유를 두고 150 으로 잡는다 — 넘기면 429 로 회차가 통째로 죽는다.
  opencritic: 150,
  metacritic: 150,
  rss: RSS_FEEDS.length,
  // 손으로 돌릴 때(pnpm crawl --source=wikidata)의 기본 몫. 정기 실행은 크론이 CRON_META_PLAN 몫으로 돈다.
  // 묶음 조회라 이름당 약 2초다(CRON_META_MS_PER_ITEM) — 150 이면 6분 안쪽.
  wikidata: 150,
  // 위키데이터 게임 조회는 별칭 한 덩어리라 응답이 작다. 병목은 요청 간격 5초뿐이다
  // (회사 경로가 2초에서 429 를 맞고 올려 둔 값). 40건 ≈ 3.5분이라 다른 메타 소스와 함께 돌 수 있다.
  // 본편이 4,907건이라 한 바퀴에 며칠이 걸린다 — 별칭은 급한 값이 아니라 그걸 감수한다.
  wikidata_game: 40,
  // 컬렉션 수만큼만 요청한다. 배치 개념이 없어 형식상의 값이다
  gamepass: Object.keys(GAMEPASS_COLLECTIONS).length,
};
/**
 * 실행 한 번이 sync_logs.items 에 남기는 게임 수 상한(sync/touched).
 * 300 인 이유: 스팀 한 회차가 1,500건이라 다 담으면 한 줄이 100KB 를 넘는다. 사람이 시트에서
 * 실제로 훑는 건 앞의 몇십 줄이고, 앞에는 새로 만든 것과 바뀐 것이 먼저 선다(확인만 한 것은 뒤).
 */
export const SYNC_LOG_ITEMS_MAX = 300;
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
  // eShop 은 요청 간격 4초라 한 번에 많이 못 당긴다. 그래도 2026-09-15 에 60 에서 240 으로 올렸다 —
  // 한국 스위치 행 87건에 일본 239건이라, 스위치 게임의 가격이 화면에서 엔화로 서고 있었다.
  // 기존 갱신은 크론 prices 가 하루 1,200건씩 따로 맡으므로 로컬 실행은 신규에 다 쓴다
  // (SEED_SHARE_BY_SOURCE.nintendo 가 몫을 0.8 로 올려 주지 않으면 이 값이 절반으로 깎인다).
  // 240건 × 4초 = 16분 + 발견 페이지 몫. 로컬은 함수 300초 제한이 없어 견딜 수 있다.
  nintendo: 240,
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
 * 2026-09-15: 말만 두지 않고 실제로 뗐다 — crawl-prices 워크플로는 이제 --seed-top 없이 돈다.
 *
 * 같은 날 한 걸음 더 갔다. "로컬이 제자리" 라는 이 판단은 **사람이 손으로 돌려야 한다**는 뜻이어서,
 * 며칠 안 돌리면 신규가 0건이 되는 값이었다. 그래서 발견의 정규 실행처는 **Vercel 서울 크론**으로 옮겼다
 * (CRON_SOURCES, CRON_PLAN). 네 소스가 그 환경에서 열리는 것은 실측했다.
 *
 * 그러면 이 상수는 무엇으로 남는가 — 크론이 막혔을 때의 **두 대비책**이 읽는 몫이다. 실행처는 셋인데
 * 몫은 여기 한 곳에서만 정한다:
 *   Vercel 서울 크론  정규. CRON_PLAN 의 discover 몫을 쓴다(이 상수가 아니다)
 *   Actions 주 1회    crawl-seed.yml. 해외 IP 라 크론과 출구가 다르다 — 이 상수를 읽는다
 *   가정용 회선       `pnpm crawl:seed`. 급할 때 손으로 당긴다 — 이 상수를 읽는다
 *
 * limit 을 따로 두는 이유: 시드 몫은 seedQuota 가 limit × 몫으로 한 번 더 깎는다.
 * seedTop 만 올리면 그 곱이 막아 아무 일도 안 일어난다([[ps-subscription-coverage]] 에서 겪은 함정).
 * limit 을 비우면 BATCH_SIZE 기본값을 쓴다.
 */
export const LOCAL_SEED_SOURCES: Source[] = ["steam", "psstore", "xbox"];
export const LOCAL_SEED_PLAN: Partial<Record<Source, { seedTop: number; limit?: number }>> = {
  // BATCH_SIZE.steam 1,500 의 절반 = SEED_SHARE_MAX 가 주는 최대치. 배치 조회라 건당 0.39초로 싸다
  steam: { seedTop: 750 },
  // psstore 는 fetchMany 가 없어 건당 요청 1회(실측 2.26초)라 제일 비싸다. 그래도 카탈로그가
  // 7,571건인데 587건만 알아서 제일 급하다 — 분 걱정이 없는 로컬에서 400건까지 올려 잡는다(약 15분).
  psstore: { seedTop: 300, limit: 400 },
  // KR 카탈로그 16,991건. 몫의 절반이 시드라 limit 300 이면 신규 150건이다
  xbox: { seedTop: 150, limit: 300 },
};

/**
 * Vercel 크론이 맡는 소스. 두 갈래가 섞여 있다.
 *
 * 1) 러너 IP 로는 못 도는 소스(nintendo, nintendo_jp, epic). 서울 리전은 한국 IP 로 나가서 열린다
 *    (2026-09-14 /api/debug/reachability 실측: nintendo 200, epic 은 curl 전송기로 200).
 * 2) 러너에서도 돌지만 **발견만** 여기로 뗀 소스(steam, psstore, xbox).
 *    발견은 Actions 시간을 크게 먹는다 — 실측으로 crawl-prices 1회가 12분에서 34분으로 뛴 원인이 발견이었다.
 *    Actions 무료 한도는 계정 전체가 나눠 쓰는 월 2,000분이고, 다른 레포가 월 약 354분을 먼저 먹는다
 *    (2026-09-15 실측). 그 유한한 분은 매일 되풀이되는 가격 갱신에 쓰고, 발견은 크론으로 옮긴다.
 *    이 네 소스가 서울 함수에서 열리는 것은 2026-09-15 에 실측했다 — 발견 경로와 가격 경로를 따로 쟀다
 *    (steam 은 store/api.steampowered.com, xbox 는 emerald/displaycatalog 로 호스트가 갈린다).
 *
 * 가격 갱신은 네 소스 모두 Actions 에 남는다. 발견과 달리 매일 같은 양이 도는 일이라
 * 주기를 예산에 맞춰 이미 잡아 뒀고, 한쪽 경로가 막혔을 때의 대비책도 된다.
 */
export const CRON_SOURCES = ["nintendo", "nintendo_jp", "epic", "steam", "psstore", "xbox"] as const;
// 주기는 vercel.json 의 crons 에 있다 — JSON 이라 주석을 못 달아 근거를 여기 적는다(시각은 UTC).
//   /api/cron/crawl/nintendo/prices       15 */6 * * *          하루 4회 × 300건 = 1,200건/일
//   /api/cron/crawl/nintendo/discover     45 1,7,13,19 * * *    하루 4회 × 60건 = 240건/일 (신규는 상품 HTML 이라 4초 간격을 탄다)
//   /api/cron/crawl/nintendo_jp/prices    35 */12 * * *         하루 2회 × 300건 = 600건/일
//   /api/cron/crawl/nintendo_jp/discover  5 2,14 * * *          하루 2회 × 60건 = 120건/일 (한 바퀴가 약 300페이지)
// 일본 몫을 2026-09-16 에 반으로 줄였다(넷에서 둘로). 이유는 산수다 — JP 행이 585개인데 하루 1,200건을
// 돌고 있었다. 같은 행을 하루에 두 번 다시 묻고 있던 것이다. 600건이면 하루 한 바퀴다.
// 더 줄이지 않는 이유: 일본에만 있는 스위치 작품이 목록에 안 나올 뿐 데이터로는 값이 있고
// (KR, JP 둘 다 가진 게임 135건은 상세에서 엔화를 참고로 보여 준다), title_code 가 지역 간 동일 작품
// 판정의 유일한 근거다(JP 474/585 가 코드를 갖는데 KR 은 270/1,118 뿐이다).
//   /api/cron/crawl/epic/prices           25 */6 * * *          하루 4회 × 110건 = 440건/일 (DLC 몫을 떼며 120에서 내렸다)
//   /api/cron/crawl/epic/discover         55 3,9,15,21 * * *    하루 4회 × 60건 = 240건/일 (한 바퀴가 175페이지)
// 가격 갱신 주기를 발견보다 성기게 두는 이유(2026-09-14): 카탈로그가 비어 있는 단계에서는
// 같은 몇십 건을 하루에 열두 번 다시 묻는 것보다 새 게임을 들이는 쪽이 낫다. 보유가 갱신 몫을
// 따라잡으면(닌텐도 168건, Epic 520건) 그때 prices 주기를 다시 촘촘하게 한다.
// 분을 0 으로 두지 않는 이유: Vercel 크론은 정각에 몰리고, 몰리면 실행이 뒤로 밀린다.
//
// 발견만 맡는 네 소스(2026-09-15 추가). 하루 2회씩, 20분 간격으로 흩어 둔다:
//   /api/cron/crawl/steam/discover    10 4,16 * * *     하루 2회 × 140건
//   /api/cron/crawl/steam/prices      20 17,18 * * *    하루 2회 × 700건 — 세일 문이 열린 직후를 잡는 자리(2026-10-02 추가)
//     스팀 할인은 태평양 오전 10시(서머타임 17:00Z, 아니면 18:00Z)에 바뀐다. Actions 의 crawl-prices 도
//     그 시각(10 17)에 예약돼 있지만 **실제로는 4~6시간 늦게 돈다** — 2026-09-29~10-01 sync_logs 실측으로
//     17:10 예약이 21:22, 21:23, 21:46 에 시작했다. 그래서 2026 가을 세일이 열리고 4시간 반 동안 아무 값도 안 바뀌었고,
//     홈 배너(services/sales)도 그만큼 늦었다. Vercel 크론은 정시에 돈다(위 소스들의 sync_logs 가 매번 :10, :50 이다).
//     두 시각인 이유: 겨울, 설 세일은 18:00Z 에 열린다(lib/sales/calendar 의 startHourUtc).
//     Actions 회차는 그대로 둔다 — 이쪽은 700건이라 스팀 11,222행의 일부만 돌고, 나머지는 그쪽이 덮는다.
//     Actions 가 정시에 와서 락이 겹치면 한쪽이 빈손으로 끝날 뿐이고, 어느 쪽이든 값은 그 시각에 들어온다.
//   /api/cron/crawl/xbox/discover     50 4,16 * * *     하루 2회 × 180건 (KR 16,991건)
//   /api/cron/crawl/xbox/prices       20 0,6,12,18 * * *  하루 4회 × 800건 = 3,200건/일 (2026-10-02 추가)
//     Actions 에서 하루 200건이던 것을 옮겼다 — 32,526행 한 바퀴가 163일이라 세일이 열려도 몇 주 뒤에야 값이 들어왔다.
//     0시를 첫 회차로 둔 이유: Xbox 할인은 대부분 00:00Z(한국 오전 9시)에 시작한다
//     (최근 60일 discount_starts_at 시각 분포: 0시 658건, 19시 37건, 10시 25건).
//     Xbox 의 다른 크론(발견 4:50, 16:50, 매칭 8:40, 20:40)과 Actions 백업(예약 17:10, 실제 21시대 시작)과 안 겹친다.
// 넷 중 둘은 껐고 크론도 뺐다. 몫은 아래 CRON_PLAN 에 그대로 남겨 둔다 — 다시 켤 때 근거를 다시 재지 않으려고다.
//
// psstore 는 2026-09-16 에 껐다가 같은 날 되살리며 **가격까지 크론으로 옮겼다**:
//   /api/cron/crawl/psstore/prices    45 */6 * * *   하루 4회 × 300건 = 1,200건/일
//   /api/cron/crawl/psstore/discover  30 4,16 * * *   하루 2회 × 120건
// Actions 로 되돌리지 않은 이유: 그 자리는 하루 2회 × 200건(408건/일)이 한계였고 그 속도로는
// 한 바퀴가 108일이다. 43,405행 중 98.7%가 출시일을 모르는 상태라(ps4 122/2,416, ps5 424/2,365)
// 그 주기로는 화면에 보이는 값이 영영 안 채워진다. 크론 1회는 800초까지 쓸 수 있어 300건이 들어가고,
// Actions 분도 12.3분/회를 통째로 돌려받는다. 두 곳에서 같이 돌리지 않는다 — Redis 락에 걸려 한쪽이 빈손이 된다.
// 갱신이 본편부터 도는 것은 REFRESH_MAIN_SHARE 가 맡는다(43,405행 중 본편은 4,781행뿐이다).
//
// 교차 매칭은 2026-09-16 에 자기 모드를 받았다(CRON_MODES 의 match). 하루 2회씩, 20분 간격으로 흩어 둔다:
//   /api/cron/crawl/steam/match        20 8,20 * * *    하루 2회 × 150건
//   /api/cron/crawl/xbox/match         40 8,20 * * *    하루 2회 × 150건
//   /api/cron/crawl/psstore/match      0 9,21 * * *     하루 2회 × 200건
//   /api/cron/crawl/epic/match         20 9,21 * * *    하루 2회 × 200건
//   /api/cron/crawl/nintendo/match     40 9,21 * * *    하루 2회 × 60건 (간격 4초라 제일 적다)
//   /api/cron/crawl/nintendo_jp/match  0 10,22 * * *    하루 2회 × 200건
// 시각을 오전 8~10시, 오후 8~10시(UTC)에 몰아 둔 이유: 가격과 발견이 쓰지 않는 시간대다.
// 같은 소스를 두 실행이 동시에 잡으면 Redis 락에 걸려 한쪽이 빈손으로 끝난다.
//
// 크론 자리를 더 늘릴 때 발견 쪽으로 기울지 말 것 — 굶은 것은 발견이 아니라 갱신 주기였다
// (psstore 하루 408건으로 한 바퀴 108일, xbox 587건으로 52일).
// 시각을 고른 기준은 둘이다.
//   1) 같은 소스를 Actions 가 도는 시각(crawl-prices 의 10 5, 10 17 UTC)과 겹치지 않게 —
//      겹치면 Redis 락에 걸려 한쪽이 빈손으로 끝난다(설계서 §4.4).
//   2) 실행이 5~9분씩 걸리므로 서로도 20분씩 띄운다. 겹쳐도 동작은 하지만 함수 동시 실행이 늘 뿐이다.
export type CronSource = (typeof CRON_SOURCES)[number];
/**
 * 크론 1회가 하는 일. 한 번에 다 하면 300초를 넘겨서 갈라 둔다.
 *
 * match 는 2026-09-16 에 더했다. 그전까지 교차 매칭(우리가 아는 게임이 이 스토어에도 있는지 제목으로
 * 찾아보는 일)은 discover 실행에 8건씩 얹혀 갔다 — 하루 16건이다. 그 속도로는 본편 14,491건을
 * 도는 데 2년이 넘게 걸린다. 실제로 본편의 76%(11,062건)가 스토어를 하나만 갖고 있고,
 * 스토어가 하나면 가격 비교라는 이 서비스의 축이 아예 서지 않는다.
 * 매칭에는 발견이 쓰는 목록 페이지 예산이 필요 없어서(검색 요청뿐이다) 모드를 따로 두는 편이 싸다.
 */
export const CRON_MODES = ["prices", "discover", "match"] as const;
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
  /**
   * 가격만 주는 배치 소스(batchPricesOnly "detail")에서 이번 회차에 **상품 HTML 로 따로 받을 기존 행** 수.
   * 한국어 지원(ko_text)이 빈 본편 행만 고른다. 한국 eShop 은 대응언어를 상품 HTML 에만 적어서,
   * 배치(가격 API)만 도는 갱신으로는 신규 등록 때 놓친 행이 영영 안 찬다(2026-10-07 실측, 빈 행 2,327건).
   * limit 안에서 자리만 차지하지만 배치 대신 건마다 요청이 나가 시간은 는다.
   */
  detailTop?: number;
}

/**
 * 소스별, 모드별 실행 몫. **요청 간격에서 역산한 값이다** — 함수 제한 800초에서
 * 잘릴 여유로 200초쯤을 남기고 600초 안쪽으로 잡는다.
 *
 * 800초는 Pro 의 상한이다(Fluid Compute. Hobby 는 300초가 끝이다). 2026-09-15 에 300초에서 올렸다.
 * 왜 잘게 나눠 자주 돌지 않는가: 발견은 **아는 것이 나오는 앞부분을 건너뛰며** 파고들어서
 * (sync/discover) 목록 페이지 값은 실행마다 새로 치르는 고정비다. steam 은 80페이지 × 1.5초 = 120초가
 * 건수와 무관하게 든다 — 같은 하루 몫을 네 번에 나누면 그 120초를 네 번 낸다. 그래서 크게 한 번이 싸다.
 * 간격은 어댑터의 minIntervalMs 가 근거다: nintendo 4초, epic 1초.
 * 값을 올리려면 먼저 실제 실행 시간을 재고(응답의 durationMs) 올린다.
 *
 * CRON_TIME_BUDGET_MS 는 "요청에 쓸 수 있는 시간" 이고, 각 몫이 이 안에 드는지는
 * cron-plan.test 가 지킨다 — 몫을 손으로 올릴 때 300초를 넘기는 실수를 테스트가 먼저 잡는다.
 */
export const CRON_TIME_BUDGET_MS = 600_000;

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
/**
 * **신규 등록** 1건을 반영하는 데 드는 시간. 위 값과 자릿수가 다르다 — 갱신은 있는 행의 값 몇 개를
 * 고치는 일이지만, 신규는 게임 행을 만들고 플랫폼, 장르, 이미지, 회사까지 함께 넣는 일이다.
 *
 * 1,800ms 의 근거(2026-09-15 실측): 배포본 크론 discover 1회에서 400건 전부가 신규였고 760초가 걸렸다.
 * 요청 몫(페이지 10초 + 배치 16초 + 매칭 18초)을 빼면 400건에 716초 → 건당 1.79초.
 *
 * 왜 이 상수가 따로 필요한가: 이 값을 400 으로 뭉뚱그렸다가 그 실행을 283초로 추정했는데 실제는
 * 760초였다(함수 상한 800초의 95%). discover 모드는 seedShare 1 이라 **처리 건수가 곧 신규 건수**라서,
 * 갱신 기준으로 세면 예산이 통째로 어긋난다.
 *
 * 2026-09-15 2차 실측으로 이 값이 맞다는 것을 확인했다. 크론 4개의 첫 실행에서 **실제로 만들어진
 * 행**을 세고(created_at 이 실행 창에 든 games) 요청 몫을 뺐다:
 *   steam   680초 - 요청 135초 = 545초 / 315행 → 1.73초
 *   xbox    315초 - 요청  69초 = 246초 / 171행 → 1.44초
 *   psstore 354초 - 요청 182초 = 172초 /  91행 → 1.89초
 * 소스가 달라도 1.2~1.9초로 모인다 — 등록 경로(createGameFromSnapshot + upsertPlatform)가 같기 때문이다.
 *
 * **틀렸던 것은 이 값이 아니라 세는 대상이었다.** 발견 건수(fresh)만 세고 같은 실행에서 함께 등록되는
 * 새 DLC 를 빼놓았다. steam 은 발견 140건을 세는 동안 DLC 230건을 더 만들고 있었다 —
 * 그래서 549초로 추정한 실행이 680초가 됐다. 세는 자리는 DLC_FETCH_PER_RUN_BY_SOURCE 다.
 */
export const CRON_DB_MS_PER_NEW_ITEM = 1800;
/**
 * 위 값을 덮어쓰는 소스별 실측. 값이 다른 이유는 등록 경로가 아니라 **한 건이 몇 행을 만드느냐**다.
 *
 * 지금은 비어 있다. 여기 있던 유일한 값은 2026-09-18 에 그 소스를 걷어내며 같이 지웠다.
 * 표를 남겨 두는 이유: 상품 응답 안에 DLC 가 함께 오는 소스는 발견 1건이 여러 행을 만들어
 * DLC 상한으로 막을 수 없다 — 그런 소스를 다시 붙이면 몫 자체에 그 무게를 실어야 한다.
 */
export const CRON_DB_MS_PER_NEW_ITEM_BY_SOURCE: Partial<Record<CronSource, number>> = {};
/** 위 둘을 더한 값에 곱할 여유. 실행 시간은 들쭉날쭉하고, 잘리면 그 실행이 통째로 버려진다 */
export const CRON_SAFETY_FACTOR = 1.15;

export const CRON_PLAN: Record<CronSource, Record<CronMode, CronRunPlan>> = {
  nintendo: {
    // 가격이 배치 50건/요청이라 요청은 6회(24초)뿐이고 남는 건 반영 시간이다: (24 + 300×0.4)×1.15 = 166초.
    // 2026-10-07 에 상세 몫 80 을 얹었다(사용자 승인, 함수 시간 하루 +30분 안쪽): 요청 (220/50 → 5회 + 80) × 4초 = 340초
    // + 반영 300 × 0.4 = 120초 → × 1.15 = 529초. 늘어난 몫은 80 × 4초 × 하루 4회 = 약 21분이다.
    prices: { limit: 300, seedTop: 0, pageBudget: 0, match: 0, detailTop: 80 },
    // 2026-09-30 에 20건에서 60건으로 올렸다. 20건이던 때는 발견이 늘 같은 288건만 봐서(adapters/nintendo 의
    // KR_CATALOG_URL 주석) 몫이 비어도 티가 안 났는데, 목록을 이어 읽게 되면서 몫이 곧 하루 유입량이 됐다
    // (한국 본편 9,697건 중 모르는 것 약 8,000건, 20건 × 4회로는 100일이 넘는다).
    // 신규는 여전히 상품 HTML 단건 조회다(batchPricesOnly "detail"). 목록으로만 등록하지 않는 이유:
    // 작품 코드(일본, 다른 스토어와 같은 게임인지 가르는 유일한 구조적 근거)와 발매일이 HTML 에만 있다 —
    // 그걸 빼고 제목으로만 등록하면 중복 게임이 생긴다.
    // 목록 10쪽 × 6초 = 60초 + 요청 (매칭 3 + 신규 60) × 4초 = 252초 + 반영 60건 × 1.8초 = 108초 → × 1.15 = 483초.
    // 목록 10쪽 = 1,000건이면 모르는 것이 8할인 지금은 1~2쪽에서 60건이 찬다. 10쪽은 포화된 뒤를 위한 값이다
    // (그때는 한 실행이 10쪽씩 앞으로 나가 하루 40쪽, 이틀 반에 한 바퀴를 돈다).
    discover: { limit: 60, seedTop: 60, pageBudget: 10, match: 3, seedShare: 1 },
    // 간격 4초라 제일 비싸다. 검색은 제목 두 개(영문, 한글)까지 나가므로 건당 최대 8.4초로 센다 → 60건 580초
    match: { limit: 0, seedTop: 0, pageBudget: 0, match: 60 },
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
    // 간격 1초. 건당 최대 2.4초 → 200건 552초
    match: { limit: 0, seedTop: 0, pageBudget: 0, match: 200 },
  },
  // ---- 아래 넷은 발견만 크론이 맡는다. 가격 갱신은 Actions 워크플로에 남아 있다 ----
  //
  // discover 몫이 작아 보이는 이유: 이 모드는 seedShare 1 이라 **처리 건수가 곧 신규 건수**이고,
  // 신규 1건은 갱신 1건의 네 배가 넘는다(CRON_DB_MS_PER_NEW_ITEM 의 실측 근거 참고).
  // 2026-09-15 첫 배포에서 이 차이를 빼먹고 한 소스를 400건으로 잡았다가 760초를 맞았다 — 상한 800초의 95%다.
  // 손으로 곱하지 말 것. cron-plan.test 의 estimateMs 가 DLC 단계까지 세고, 그게 이 숫자들의 출처다.
  steam: {
    // 가격은 Actions 가 맡고, 이 몫은 세일 문이 열린 직후 크론 두 회차(20 17,18)와 손으로 돌릴 때 쓴다
    // (신규가 없어 건당 0.4초로 싸다). 크론에 올린 이유는 CRON_SOURCES 아래 주기 표에 있다.
    // 2026-09-15 에 1,000 에서 800 으로 내렸다. 이 모드가 느려진 게 아니라, 새 DLC 등록 몫
    // (DLC_FETCH_PER_RUN_BY_SOURCE.steam 40건 × 1.8초)을 이제 제대로 세기 때문이다 —
    // DLC 단계는 prices 모드에서도 똑같이 돈다(sync/run-store 4단계).
    // 2026-09-18 에 800 에서 700 으로 내렸다 — 패치, 사양 단계를 예산에 넣자 800 은 109%가 됐다.
    prices: { limit: 700, seedTop: 0, pageBudget: 0, match: 0 },
    // 592초. 2026-09-15 에 140 에서 120 으로 내렸다 — 140 은 실측 680초를 냈다(추정은 549초였다).
    // 차이는 발견이 아니라 같은 실행이 함께 등록한 새 DLC 230건이었다. 그쪽에 상한 40 을 걸고
    // (DLC_FETCH_PER_RUN_BY_SOURCE.steam) 남는 자리에 맞춰 몫을 다시 잡았다.
    // 페이지 예산 80 의 근거는 DISCOVERY_PAGE_BUDGET.steam 주석에 있다(아는 8,000건 구간을 건너뛴다).
    // 2026-09-18 에 120 에서 90 으로 내렸다. 이 모드가 느려진 게 아니라 **예산 계산이 두 단계를
    // 빼먹고 있었다** — 패치 30요청(52초)과 사양 10요청(17초)이다. 둘을 넣으면 120 은 113%다.
    // 큰 쪽은 패치이고 그건 원래 있던 구멍이다. 발견 몫이 준 것은 그 구멍을 메운 대가다.
    discover: { limit: 90, seedTop: 90, pageBudget: 80, match: 8, seedShare: 1 },
    // 간격 1.5초. 건당 최대 3.4초 → 150건 587초. 하루 2회면 300건이라 본편 11,301건을 38일에 한 바퀴 돈다
    match: { limit: 0, seedTop: 0, pageBudget: 0, match: 150 },
  },
  psstore: {
    // 559초. 2026-09-16 에 200 에서 300 으로 올렸다 — 가격 갱신이 Actions 에서 이 크론으로 옮겨 왔다.
    // fetchMany 가 없어 건당 요청 1회(간격 1초) + 반영 0.4초라 건당 1.4초다.
    // 상한은 325건이다(cron-plan.test 의 estimateMs 가 600초에서 역산한다) — 여유를 두고 300 에 멈춘다.
    prices: { limit: 300, seedTop: 0, pageBudget: 0, match: 0 },
    // 578초. fetchMany 가 없어 **한 건이 요청 한 번**이고(간격 1초) 거기에 신규 반영 1.8초가
    // 더 붙어 건당 2.8초다 — 네 소스 중 건당 단가가 제일 비싸다.
    //
    // 그런데 제일 굶은 소스다: KR 카탈로그 7,571건 중 587건만 안다(2026-09-15).
    // 2026-09-15 에 80 에서 120 으로 올렸다. 근거는 실측이다 — 첫 크론 실행이 354초로 끝나
    // 예산 800초에 446초가 남아 있었다. 그 자리를 두 곳에서 만들었다:
    //   DLC 신규 상한 60 → 20 (요청 40초 + 반영 72초 회수)
    //   남은 여유를 발견 몫으로
    // 하루 2회 × 120건이면 한 바퀴가 44일에서 29일로 준다.
    discover: { limit: 120, seedTop: 120, pageBudget: 90, match: 8, seedShare: 1 },
    // 간격 1초. 건당 최대 2.4초 → 200건 552초
    match: { limit: 0, seedTop: 0, pageBudget: 0, match: 200 },
  },
  xbox: {
    // 557초(cron-plan.test 추정, 900 이면 612초로 넘친다). 추정은 반영을 건당 0.4초로 보수적으로 센다 —
    // 실측은 훨씬 싸다: Actions 의 Xbox 단계가 200건에 66초, 87초였다(2026-09-29~10-01 sync_logs).
    // bigIds 배치가 20건을 요청 2회(한국어, 영문)로 묻기 때문이다. "건당 요청 1회" 는 배치가 생기기 전 이야기다.
    prices: { limit: 800, seedTop: 0, pageBudget: 0, match: 0 },
    // 583초. KR 카탈로그 16,991건이라 한 바퀴가 길다 — 며칠에 걸쳐 채우는 것을 전제로 한 값이다.
    // 2026-09-15 에 180 에서 160 으로 내렸다. 실측 자체는 315초로 여유로웠지만 그건 페이지를 9장만
    // 읽었을 때다(예산은 60장). 카탈로그가 차면 그 50장이 75초로 돌아오고, 새 DLC 40건도 함께 센다.
    discover: { limit: 160, seedTop: 160, pageBudget: 60, match: 8, seedShare: 1 },
    // 간격 1.5초. 건당 최대 3.4초 → 150건 587초
    match: { limit: 0, seedTop: 0, pageBudget: 0, match: 150 },
  },
  epic: {
    // 2026-09-15 에 120 에서 110 으로 내렸다 — DLC 목록 3회와 새 DLC 상세 10건이 이 모드에 새로 붙었다.
    // 요청 (110 + 3 + 10) × 1초 + 반영 (110 + 10)건 × 0.4초 → 197초. 첫 실측(180건)이 250초라 보수적으로 잡는다
    prices: { limit: 110, seedTop: 0, pageBudget: 0, match: 0 },
    // 요청 (60페이지 + 60건 + 매칭 8) × 1초 + 반영 60건 × 0.4초 → 175초. 한 바퀴가 175페이지라 나눠 돈다
    // 60건 전부를 신규에 준다. Epic 기존 가격은 prices 모드가 따로 돈다
    discover: { limit: 60, seedTop: 60, pageBudget: 60, match: 8, seedShare: 1 },
    // 간격 1초. 건당 최대 2.4초 → 200건 552초
    match: { limit: 0, seedTop: 0, pageBudget: 0, match: 200 },
  },
};

/**
 * 메타 소스 크론 — 스토어와 갈라 둔 이유는 모드가 다르기 때문이다.
 * 메타 소스에는 가격도 발견도 없다. 할 일은 둘뿐이다: 제목으로 항목 찾기(match), 찾은 항목 조회하기(collect).
 * 스토어 CRON_PLAN 에 억지로 끼우면 소스 7개마다 쓰지 않는 모드가 하나씩 생긴다.
 *
 * 2026-09-17 에 Actions(crawl-catalog.yml)에서 여기로 옮겼다. 옮긴 이유는 산수다 —
 * 그 워크플로는 격일 match=120 이라 하루 60건인데, 주석이 쓰인 뒤 본편이 4,907 에서 14,788 로 늘어
 * 한 바퀴가 82일이 아니라 240일이 됐다. Actions 무료 분(월 2,000, 계정 전체가 나눠 쓴다)으로 그 속도를
 * 네 배로 올리면 정작 매일 도는 가격 수집이 한도에 밀린다. 크론은 그 예산 밖이다.
 * 위키데이터는 IP 를 가리지 않아 리전 제약도 없다 — 서울이든 미국이든 똑같이 열린다.
 *
 * **두 곳에서 같이 돌리지 않는다** — 같은 소스를 두 실행이 잡으면 Redis 락에 걸려 한쪽이 빈손이 된다.
 * 그래서 crawl-catalog.yml 에서 wikidata_game 단계를 뺐다(회사 수집도 2026-09-30 에 뒤따라 뺐다).
 */
/**
 * wikidata(회사)는 2026-09-30 에 crawl-catalog.yml 의 주 1회에서 여기로 옮겼다. 옮긴 이유도 산수다 —
 * 주 150개 이름으로는 한 주에 새로 들어오는 게임(3,541건/7일)의 회사 이름도 못 따라갔다.
 * 회사 소스에는 매칭 단계가 없다 — collect 모드만 크론에 건다(match 몫은 0).
 */
export const CRON_META_SOURCES = ["wikidata_game", "wikidata"] as const;
export type CronMetaSource = (typeof CRON_META_SOURCES)[number];

/**
 * 메타 소스 크론의 모드.
 *   match    제목으로 위키데이터 항목을 찾아 ref 를 만든다. 별칭 없는 게임 대다수가 여기서 막혀 있다
 *   collect  ref 가 있는 게임의 별칭을 받아 온다
 */
export const CRON_META_MODES = ["match", "collect"] as const;
export type CronMetaMode = (typeof CRON_META_MODES)[number];

export interface CronMetaRunPlan {
  /** 이번 실행에서 조회할 건수. 0 이면 수집을 돌지 않는다(match 모드) */
  limit: number;
  /** 이번 실행에서 매칭해 볼 미매칭 게임 수. 0 이면 매칭을 돌지 않는다(collect 모드) */
  match: number;
  /**
   * vercel.json 에 걸어 둔 하루 실행 횟수. 몫 옆에 두는 이유는 검증 때문이다 —
   * 두 모드가 균형을 이루는지는 회차당 건수가 아니라 **하루 처리량**으로만 판정할 수 있는데,
   * 그 값이 JSON 에만 있으면 테스트가 못 본다. vercel.json 을 고치면 여기도 같이 고친다.
   */
  runsPerDay: number;
}

/**
 * 메타 소스 건당 실측 시간. 스토어 쪽은 요청 횟수 × 간격으로 세지만(cron-plan.test 의 estimateMs)
 * 메타 소스는 간격(5초)이 응답 시간을 덮어 버려서 건당 실측 하나로 세는 편이 정확하다.
 *
 * 2026-09-15 실측(로컬에서 작은 배치로 두 번 돌려 쟀다. 4~6건짜리 표본이었다):
 *   match   8.6초 — 6건이 51.4초
 *   collect 5.8초 — 4건이 23.1초
 *
 * 2026-09-17 에 라우트를 통째로 돌려 다시 쟀다. **표본이 작아서 둘 다 낙관적이었다**:
 *   match   8.93초 — 60건이 535.6초 (8.6초로 보면 회차가 예산을 16초 넘긴다)
 *   collect 7.31초 — 88건이 643.3초 (5.8초로 보면 43초 넘긴다. 실제로 넘겨 봤다)
 *
 * 이 재측정은 별칭 백필이 같이 도는 중에 나온 값이라 위키데이터 응답이 평소보다 느렸을 수 있다.
 * 그래도 느린 쪽을 쓴다 — 예산이 빠듯해서 잘리면 그 실행이 통째로 버려지고, 빠른 쪽으로 잡아 두면
 * 백필처럼 같이 도는 일이 생길 때마다 잘린다. 값을 내리려면 백필이 끝난 뒤 다시 재고 내린다.
 */
export const CRON_META_MS_PER_ITEM: Record<CronMetaSource, Record<CronMetaMode, number>> = {
  wikidata_game: { match: 8930, collect: 7310 },
  // 회사 묶음 조회(adapters/wikidata lookupMany). 매칭 단계가 없어 match 는 쓰이지 않는다.
  // collect 2.2초 = 2026-09-30 실측 1.55초(실제 대기 이름 40개를 묶음 조회로 62초, 검색 간격 500ms, 상세 질의 포함)에
  // 붙이는 쓰기 몫을 얹은 값이다. 붙는 이름이 15%(6/40)이고 한 번 붙일 때 서울 리전에서 Neon 왕복 여섯 번(1.3초)이라
  // 이름당 0.2초꼴이다. 크론의 첫 durationMs 로 다시 잰다.
  wikidata: { match: 0, collect: 2200 },
};

/**
 * 메타 소스의 모드별 몫. CRON_TIME_BUDGET_MS(600초)를 CRON_META_MS_PER_ITEM 과 여유로 나눈 값이다.
 * 손으로 곱하지 말 것 — cron-plan.test 가 같은 식으로 다시 세고 넘치면 막는다.
 *
 * 주기는 vercel.json 에 있다(시각은 UTC). 회차 수는 runsPerDay 에 같이 적는다:
 *   /api/cron/crawl/wikidata_game/match    0 5,11,17,23 * * *    하루 4회 × 58건 = 232건/일
 *   /api/cron/crawl/wikidata_game/collect  30 5,11,17,23 * * *   하루 4회 × 71건 = 284건/일
 *
 * collect 하루 몫이 match 보다 많아야 하는 이유: 매칭한 것 중 auto 로 붙는 만큼이 조회 대기줄에
 * 새로 선다. 붙는 비율은 어떤 게임이 줄에 섰느냐로 갈린다 — 2026-09-17 실측으로 인기 한글 제목
 * 표본은 91%(118건 중 107), 생성일 순으로 도는 크론 큐 표본은 78%(60건 중 47)였다.
 * 높은 쪽으로 세도 232 × 0.91 = 211건이라 collect 284건 안에 든다.
 * collect 가 그보다 적으면 줄이 계속 길어진다 — crawl-catalog.yml 의 match=120 대 limit=60 이
 * 정확히 그 상태였다. 회차당 건수로는 이 관계가 안 보인다(71 < 60 이 아니다). 하루로 세야 보인다.
 *
 * 한 바퀴: 매칭 대기 14,263건(2026-09-17) 기준 약 62일. 신규 유입은 하루 수십 건까지 떨어졌으므로
 * (최근 7일 등록 10,419 → 3,791 → 428 → 53) 한 바퀴를 돌고 나면 이 몫은 남아돈다. 그때 주기를 줄인다.
 *
 * 시각은 기존 크론이 비워 둔 자리다(5, 11, 17, 23시 UTC). 다른 소스와 겹쳐도 락은 소스별이라 상관없지만
 * match 와 collect 는 같은 소스라 30분 띄운다 — 겹치면 한쪽이 빈손이 된다.
 */
export const CRON_META_PLAN: Record<CronMetaSource, Record<CronMetaMode, CronMetaRunPlan>> = {
  wikidata_game: {
    // 58 × 8.93초 × 1.15 = 596초. 실측 60건 535.6초(여유 없이 쓰면 616초)
    match: { limit: 0, match: 58, runsPerDay: 4 },
    // 71 × 7.31초 × 1.15 = 597초. 88 로 잡았다가 실측 643초를 맞은 자리다(위 상수 주석)
    collect: { limit: 71, match: 0, runsPerDay: 4 },
  },
  wikidata: {
    match: { limit: 0, match: 0, runsPerDay: 0 },
    // 230 × 2.2초 × 1.15 = 582초. 하루 2회 460개 이름 — 못 붙인 이름은 30일 쉬므로(COMPANY_MISS_RETRY_DAYS)
    // 같은 이름을 다시 묻느라 몫을 쓰지 않는다. 별칭으로 바로 잇는 게임은 이 몫과 상관없이 전부 잇는다
    collect: { limit: 230, match: 0, runsPerDay: 2 },
  },
};

/** --seed-top 으로 카탈로그를 훑어 신규 게임을 등록할 수 있는 소스 (어댑터가 discoverPages 를 가진 소스) */
export const SEEDABLE_SOURCES: Source[] = ["steam", "psstore", "xbox", "nintendo", "nintendo_jp", "epic"];
/**
 * 한 실행에서 목록 페이지를 몇 장까지 읽을지. 발견은 아는 것이 나오는 앞부분을 건너뛰며 파고들기 때문에
 * (sync/discover) 카탈로그가 커질수록 건너뛸 페이지가 늘어난다. 그렇다고 무한정 읽으면
 * 정작 가격 수집 시간을 잡아먹으므로, 요청 간격 × 이 값이 몇 분 안에 끝나도록 잡는다.
 */
export const DISCOVERY_PAGE_BUDGET: Partial<Record<StoreSource, number>> = {
  // 1.5초 × 80 ≈ 2분. 페이지당 100건이라 이미 아는 8,000건 구간을 건너뛰고도 신규를 만난다
  steam: 80,
  // 6초 × 110 ≈ 11분. 전체 목록이 100건/쪽, 102쪽이라 한 실행에 한 바퀴를 다 돈다.
  // 이 값은 **로컬 실행에서만** 쓰인다 — 닌텐도는 Actions 워크플로에 없고, 크론은 pageBudget 을
  // 직접 넘긴다(CRON_PLAN). 그래서 Actions 무료 분과 함수 시간 어디에도 영향이 없다.
  nintendo: 110,
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
 * 발견 커서(이어 읽을 쪽 번호)를 두는 Redis 키. resumableDiscovery 를 켠 어댑터만 쓴다(store-targets).
 * DB 가 아니라 Redis 에 두는 이유: 잃어도 되는 값이다 — 사라지면 1쪽부터 다시 읽을 뿐 데이터는 안 틀린다.
 * 그런 값에 테이블과 마이그레이션을 들이지 않는다.
 */
export const discoveryCursorKey = (source: StoreSource): string => `discover:cursor:${source}`;
/**
 * 커서 수명. 크론이 하루 4회 돌면 늘 새로 쓰이므로 사실상 만료되지 않는다.
 * 한 달을 두는 이유는 소스를 끄고 오래 뒀다 켰을 때다 — 그 사이 목록이 바뀌었을 테니 처음부터 읽는 게 낫다.
 */
export const DISCOVERY_CURSOR_TTL_SEC = 30 * 24 * 3600;
/**
 * 매칭에서 떨어진 ID(matched_by "none")도 발견에서는 **모르는 것**으로 보는 소스.
 *
 * 왜 필요했나(2026-09-30 실측): 매칭 모드는 "우리 게임 X 가 이 스토어에 있나" 를 제목으로 찾다가,
 * 닮지 않은 후보 E 를 (X, E, none) 으로 적어 둔다. 발견은 그 E 까지 "이미 아는 것" 으로 쳐서
 * **E 는 영영 새 게임으로도 등록되지 않았다** — 한국 닌텐도에서만 877건. E 는 X 가 아니라고 판정된 것이지
 * 카탈로그에 없어도 된다고 판정된 것이 아니다.
 *
 * 닌텐도만 켠 이유: 다른 스토어도 같은 구멍일 수 있지만(psstore none 4,250, xbox 6,158, epic 5,338)
 * 한꺼번에 열면 애매하게 떨어졌던 후보가 새 게임으로 쏟아진다. 중복 방지(작품 코드, 제목, 이미 ref 가
 * 있는 게임의 두 번째 SKU 거르기)가 이 소스에서 버티는지 본 뒤에 넓힌다.
 */
export const DISCOVERY_RETRY_UNMATCHED_SOURCES: StoreSource[] = ["nintendo"];

/**
 * 신규 시드가 한 배치에서 가져갈 수 있는 몫의 상한. 시드는 대상 목록 맨 앞에 붙으므로
 * 상한이 없으면 카탈로그가 비어 있는 초기에 시드가 배치를 통째로 먹고 기존 게임 가격이 안 갱신된다.
 * 0.5 = 신규 유입과 기존 갱신을 반씩. Steam 기준 실행당 750건 신규(LOCAL_SEED_PLAN.steam).
 * 하루 몇 건이 되는지는 `pnpm crawl:seed` 를 몇 번 돌리느냐로 정해진다 — 발견은 Actions 에 없다.
 */
export const SEED_SHARE_MAX = 0.5;
/**
 * 소스별 몫 덮어쓰기. 카탈로그의 대부분을 아직 모르는 소스는 절반이 너무 후하다 —
 * 아는 것이 적으면 그 적은 것을 하루 세 번 다시 묻는 데 배치의 절반이 나간다.
 *
 * psstore 0.75 의 근거(2026-09-14 실측): 매핑된 게임이 155건인데 KR 카탈로그는 7,571건이다.
 * 155건은 전부 2일 안에 갱신돼 있어(game_platforms.last_synced_at) 재조회 몫이 남아돌고,
 * 발견은 `stoppedBy: "want"` 로 멈춘다 — 더 찾을 게 있는데 몫이 없어 멈춘다는 뜻이다.
 * 0.75 로 올리면 신규가 배치의 절반이 아니라 3/4 를 가져간다. 배치 크기는 그대로라 실행 시간이 늘지 않는다.
 *
 * 2026-09-15 확인: 먹히고 있다 — 매핑이 155건에서 587건으로 늘었다(discovery fresh 150, pages 20,
 * stoppedBy "want"). 남은 약 7,000건이 목표다.
 *
 * 2026-09-15 이후 이 값이 걸리는 곳은 **로컬 실행뿐이다.** crawl-prices 워크플로가 발견을 떼면서
 * (그 파일의 cron 주석) Actions 는 --seed-top 없이 돌고, 크론 discover 는 seedShare 1 을 직접 넘긴다.
 * 그래서 속도를 정하는 것은 `pnpm crawl:seed` 를 얼마나 자주 돌리느냐다 — LOCAL_SEED_PLAN.psstore
 * (limit 400 × 0.75 = 실행당 300건)와 이 값을 함께 본다.
 * **여기서 더 올리지 않는다.** 남은 손잡이는 배치 크기인데, psstore 는 fetchMany 가 없어 건당 요청
 * 1회(200건에 737초)라 배치를 키우면 실행 시간이 그대로 따라 는다.
 * 보유가 카탈로그를 따라잡으면 이 줄을 지워 기본값(절반)으로 되돌린다.
 */
export const SEED_SHARE_BY_SOURCE: Partial<Record<StoreSource, number>> = {
  psstore: 0.75,
  // nintendo 0.8 의 근거(2026-09-15 실측): 한국 스위치 행이 87건인데 일본은 239건이다.
  // 그래서 스위치 게임 32개가 다른 스토어는 원화인데 스위치만 엔화로 서 있었다 — 한국 행이 없어서다.
  // 아는 것이 87건뿐이라 절반(150건)을 재조회에 주는 것은 낭비다. 게다가 기존 갱신은
  // 크론 prices 가 하루 1,200건으로 따로 맡는다. 로컬 실행의 몫은 신규에 쏟는 쪽이 맞다.
  // 이 값은 로컬에만 걸린다 — 크론 discover 는 seedShare 1 을, prices 는 seedTop 0 을 직접 넘긴다.
  nintendo: 0.8,
};
/**
 * 갱신 몫 중 **본편**에게 먼저 주는 비율. 나머지가 DLC, 에디션, 번들, 체험판 몫이다.
 *
 * 왜 필요한가: 갱신 대상은 lastSyncedAt 이 오래된 순으로만 골랐다. 그 줄에서는 본편과 DLC 가
 * 같은 값이라, 카탈로그가 DLC 쪽으로 기운 스토어에서는 본편이 뒤로 밀린다.
 * 2026-09-16 실측으로 PS 는 game_platforms 43,405행 중 본편이 4,781행(11%)뿐이고 나머지가 DLC 다 —
 * 몫을 고르게 나누면 본편 한 바퀴에도 카탈로그 전체를 도는 시간이 든다.
 *
 * 0.7 로 잡은 이유: 본편 한 바퀴를 며칠 안에 끝내되 DLC 를 굶기지는 않는다. PS 기준
 * 하루 1,200건이면 본편 840건(한 바퀴 6일), DLC 360건(한 바퀴 107일)이 된다.
 * 화면이 먼저 보여 주는 값은 본편 가격이고, DLC 가격은 상세로 들어가야 보인다.
 * 본편이 몫보다 적은 스토어(steam)에서는 남는 자리가 그대로 DLC 로 간다 — 아무것도 잃지 않는다.
 */
export const REFRESH_MAIN_SHARE = 0.7;

/**
 * 한 회차에서 **최근 조회된 게임**에 먼저 주는 비율(회차 전체 기준, 본편 몫 안에서 뗀다).
 *
 * 왜(2026-10-06 사용자 결정): 사람들이 실제로 연 게임의 값이 가장 신선해야 한다. 오래된 순은 카탈로그를
 * 고르게 훑을 뿐이라, 방금 누가 본 게임이 다음 갱신까지 며칠을 기다린다.
 * 0.2 는 사용자가 정한 값이다. 조회된 게임이 몫보다 적으면 남는 자리는 인기, 오래된 순이 그대로 가져간다.
 * 최근에 돈 게임은 건너뛴다(REFRESH_POPULAR_MIN_AGE_HOURS) — 안 그러면 많이 본 몇 개만 매 회차 다시 묻는다.
 */
export const REFRESH_VIEWED_SHARE = 0.2;

/**
 * 본편 몫 안에서 **인기순으로 먼저** 고르는 비율. 나머지 본편 몫은 지금처럼 오래된 순이다.
 *
 * 왜 필요한가(2026-10-02, Xbox): 세일이 열렸는지는 사람들이 보는 게임의 값이 바뀌었는지로 판정한다.
 * 그런데 오래된 순은 카탈로그를 무작위에 가깝게 훑어서, Xbox 32,526행에서는 인기작 한 개가 돌아오는 데
 * 몇 주가 걸린다(실측: 마지막 갱신 경과일 중앙값 16.9일, 24시간 안에 갱신된 행 426개).
 * 지금 세일 중인 것은 대개 인기작인데 그 값이 가장 늦게 들어오고 있었다.
 *
 * Xbox 만 켜는 이유: 순번(popularity_rank)이나 평가 수(user_score_count)가 있어야 순서를 세운다.
 * Xbox 본편 10,243개 중 8,321개가 평가 수를 갖는다. 다른 스토어는 갱신 주기가 이미 짧다
 * (스팀 하루 3회 1,500건, PS 하루 1,200건) — 필요해지면 여기 한 줄을 더한다.
 *
 * 0.4 의 셈(Xbox 크론 하루 4회 × 800건): 인기 320 + 오래된 본편 240 + 나머지 240 이 한 회차다.
 *   인기작 상위 1,280개가 날마다 한 번씩 돈다(REFRESH_POPULAR_MIN_AGE_HOURS 가 같은 날 겹침을 막는다)
 *   오래된 본편은 하루 960건이라 본편 10,243개 한 바퀴가 약 11일
 *   DLC, 에디션 등 22,336행은 하루 960건(+ Actions 백업 회차)이라 한 바퀴가 약 23일
 * 그전에는 전부 합쳐 하루 200건이라 한 바퀴가 163일이었다.
 */
export const REFRESH_POPULAR_SHARE_BY_SOURCE: Partial<Record<StoreSource, number>> = {
  xbox: 0.4,
};
/**
 * 인기순 몫이 같은 게임을 다시 고르지 않는 시간. 크론이 6시간마다 도는데 이 값이 없으면
 * 네 회차가 모두 상위 320개만 다시 묻는다. 20시간이면 하루 네 회차가 서로 다른 게임을 집고,
 * 다음 날 같은 시각에는 상위작이 다시 자격을 얻는다(24시간 > 20시간).
 */
export const REFRESH_POPULAR_MIN_AGE_HOURS = 20;

/**
 * `games` 마스터(제목, 설명, 이미지, 회사)를 **덮어쓸 수 있는** 소스. 나머지 소스는 빈 칸만 채운다.
 *
 * 2026-09-16 이전에는 store-apply 가 아예 steam 스냅샷에서만 마스터를 갱신했다. 그래서 스팀에 없는
 * 게임은 등록 순간의 값에 영원히 멈춰 있었다 — 실측으로 본편 14,491건 중 한국어 제목이 11,921건(82%),
 * 설명이 10,704건(74%), 개발사가 10,677건(74%) 비어 있었고, xbox 단독 게임만 7,278건이었다.
 * 값을 주는 어댑터는 이미 있었다(xbox ProductTitle/ShortDescription/DeveloperName, epic description,
 * nintendo 한국어 제목). 막고 있던 것은 그 가드 한 줄이다.
 *
 * 그래서 가드를 풀되 **권위는 steam 하나만** 갖는다. 모든 소스에 덮어쓰기를 열면 같은 필드를
 * 스토어끼리 번갈아 뒤집는다 — 스팀이 "엘든 링" 으로 쓰면 다음 xbox 실행이 "ELDEN RING" 으로
 * 되돌리는 식이다. 그 왕복은 매 실행 changedSlugs 에 들어가 캐시를 통째로 무효화한다(§7).
 *
 * 비-steam 이 빈 칸만 채우는 값이라도 잃는 것은 없다. 빈 칸이 채워지는 것이 지금 문제이고,
 * 이미 값이 있는 자리는 steam 이 계속 고친다.
 *
 * 원래 이 자리에 있던 TEXT_FILL_ONLY_SOURCES(nintendo, nintendo_jp)는 이 규칙에 흡수됐다 —
 * 일본, 한국 eShop 표기가 영문 제목 자리를 덮지 않게 하려던 것이고, 그 둘도 비-steam 이다.
 */
export const META_OVERWRITE_SOURCES: Source[] = ["steam"];

/**
 * 세로 아트(games.portrait_url)를 **단건 조회로** 주는 스토어. 백필(scripts/backfill-portraits)의 대상 선정에 쓴다.
 *
 * "단건 조회로" 가 조건이다. 백필은 이미 등록된 게임을 다시 묻는 일이라 발견 목록을 거치지 않는다.
 * 목록에만 이미지가 있는 소스는 여기 넣어 봐야 요청만 쓰고 빈손으로 돌아온다.
 *
 * 빠진 소스와 이유(2026-09-18 실측):
 *   psstore — 상세 응답의 meta 에 이미지가 **아예 없다**(adapters/psstore/parse 의 meta 는 제목뿐).
 *             이미지는 발견 목록(SearchCandidate)에만 온다. 표본 20건 백필 결과 0건 채움.
 *             이 소스의 세로는 발견이 새로 훑을 때만 들어온다.
 *   nintendo, nintendo_jp — 한국, 일본 eShop 응답에 세로 비율 이미지 자체가 없다.
 *             그 소스만 아는 게임은 화면이 커버로 폴백하는 것이 최종 답이다.
 *
 * 여기에 소스를 더하기 전에 `--source=<새 소스> --limit=20 --dry` 로 채움률을 먼저 본다.
 */
export const PORTRAIT_SOURCES: StoreSource[] = ["steam", "xbox", "epic"];

/** 스토어 소스 → 담당 플랫폼 (§11-6: PS4/PS5, Switch/Switch2 분리 유지) */
export const SOURCE_PLATFORMS: Record<StoreSource, Platform[]> = {
  steam: ["steam"], psstore: ["ps5", "ps4"], xbox: ["xbox"], nintendo: ["switch", "switch2"],
  nintendo_jp: ["switch", "switch2"], epic: ["epic"],
};
/**
 * 소스가 파는 나라. 같은 기기라도 나라가 다르면 game_platforms 행이 따로다 —
 * 그래서 "이 소스의 행" 을 고를 때는 플랫폼만으로 부족하고 이 값이 함께 조건에 들어가야 한다.
 * 안 그러면 일본 수집이 한국 행을 덮어쓴다.
 */
export const SOURCE_REGION: Record<StoreSource, Region> = {
  steam: "KR", psstore: "KR", xbox: "KR", nintendo: "KR", nintendo_jp: "JP", epic: "KR",
};
/**
 * 인기순위를 몇 페이지까지 훑을까. **소스마다 페이지 크기가 달라** 장수로 통일하면 깊이가 제각각이다.
 *
 * 기준은 "몇 위까지 볼 것인가" 다. 화면이 인기순을 쓰는 자리는 홈 첫 줄과 목록 첫 장이라
 * 2,000위 아래는 닿지 않는다 — 더 읽어도 화면이 달라지지 않는다.
 *   steam    페이지 100건 × 20장 = 2,000위. 간격 1.5초라 30초(실측 47초)
 *   psstore  페이지  24건 × 40장 =   960위. 간격 1초라 40초. 카탈로그가 7,571건이라 이 깊이면 충분하다
 *
 * 더 깊은 순번은 발견이 인기순위까지 파고드는 날 공짜로 딸려 온다(store-targets 의 onRanked).
 */
export const POPULARITY_RANK_PAGES: Partial<Record<StoreSource, number>> = {
  steam: 20,
  psstore: 40,
};
/** 목록을 주는데 위 지도에 없는 소스의 기본값 */
export const POPULARITY_RANK_PAGES_DEFAULT = 20;
/** §10 파싱 검증: 성공 건 중 가격 0/null 비율이 이 값을 넘으면 반영 생략 + partial */
export const SUSPICIOUS_PRICE_RATIO = 0.5;
export const SUSPICIOUS_MIN_SAMPLE = 10;
export const ERROR_SAMPLE_MAX = 3;
/**
 * 스토어가 연달아 이만큼 "없다" 고 하면 갱신 대상에서 뺀다(game_source_refs.missing_streak).
 *
 * 3 인 근거: 한 번은 일시적 오류일 수 있고 두 번은 우연이 겹칠 수 있다. 세 번이면 그 상품이
 * 그 나라 스토어에 없다고 보는 편이 맞다 — 되살아나면 아래 주기가 다시 확인해 준다.
 */
export const MISSING_STREAK_MAX = 3;
/**
 * 제외한 ref 를 다시 물어보는 주기(일). **영구 제외를 하지 않는 이유**는 스토어가 상품을 되살리기
 * 때문이다(지역 판매 재개, 퍼블리셔 교체). 30일이면 되살아난 게임을 한 달 안에 도로 잡고,
 * 죽은 상품에는 한 달에 한 번만 요청을 쓴다.
 */
export const MISSING_RETRY_DAYS = 30;
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
 * 거기서 나온 새 DLC 는 각각 상세를 받아야 게임 레코드가 된다.
 *
 * **2026-09-15 정정: 배치 조회가 있는 소스도 공짜가 아니다.** 전에는 steam, xbox 를 비워 뒀는데
 * (상한 없음 = 나온 만큼 전부 등록) 그때 센 것은 요청 시간뿐이었다. 요청은 50건에 1회라 정말 싸지만
 * **반영 시간은 건수만큼 든다**(CRON_DB_MS_PER_NEW_ITEM, 건당 1.8초). 실측: steam discover 한 실행이
 * 발견 140건을 처리하는 동안 새 DLC 230건을 함께 등록했고, 그 몫이 실행을 680초로 밀어 올렸다.
 * 상한이 없으면 최악은 DLC_LIST_PER_RUN 60 × DLC_PER_GAME_MAX 30 = 1,800건 ≈ 54분이다 —
 * 함수(800초)가 잘리고 그 실행이 통째로 버려진다. 조용히 일어나서 로그에도 이유가 안 남는다.
 *
 * fetchMany 가 없는 소스(epic, psstore)는 여기에 요청 시간까지 더 든다 — 새 DLC 한 건이 요청 한 번이다.
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
  // 2026-09-15 에 60 에서 20 으로 내렸다. 60 은 Actions(타임아웃 60분) 시절 값이라 800초 함수에는 과했다 —
  // 요청 60초에 반영 108초를 발견보다 먼저 가져간다. psstore 는 KR 7,571건 중 587건만 아는 제일 굶은
  // 소스라, 그 자리를 본편 발견 몫에 준다(CRON_PLAN.psstore.discover 80 → 120).
  psstore: 20,
  // steam, xbox 40: 위 정정의 결과다. 요청은 배치라 거의 안 들지만 반영이 40 × 1.8초 = 72초를 쓴다.
  // 40 인 근거는 실측 분포다 — steam 은 한 실행에 230건까지 올라왔다(상한이 없어서 전부 등록됐다).
  // 40 으로 자르면 남는 것은 다음 실행으로 밀린다: 본편의 dlc_listed_at 이 이미 찍혀 있어
  // DLC_LIST_REFRESH_DAYS 뒤에 다시 걸린다. 새 DLC 가 며칠 늦는 대가로 실행이 잘리지 않는 쪽을 택했다.
  steam: 40,
  xbox: 40,
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
 * DLC 목록과 같은 성격의 경로다 — 배치가 없어 게임 1개가 요청 1회다(steam ISteamNews).
 * 그래서 한도의 근거도 같은 자리에서 온다: **Actions 사용 분**이다.
 *   steam 30건 × 요청 간격 1.5초 = 45초
 * 하루 3회(crawl-prices 의 cron)면 월 약 68분이다.
 *
 * crawl-prices 는 이미 1회 33분, 월 3,000분으로 무료 한도(2,000분)를 넘고 있다(워크플로 주석의 실측).
 * 이 단계는 그 위에 3%를 더한다 — 여기서 더 올리기 전에 **먼저 볼 것은 33분 쪽**이다.
 * 그 33분의 절반 이상이 신규 등록이라 LOCAL_SEED_SOURCES 가 그걸 덜어내는 중이고, 한도가 풀리면
 * 이 값도 같이 올린다. 카탈로그를 한 바퀴 도는 속도는 이 값이 정한다(하루 90건).
 */
export const PATCH_LIST_PER_RUN = 30;
/**
 * 소스별 상한. 지금은 비어 있다 — 패치 기록을 주는 스토어가 steam 하나뿐이라(PATCH_SOURCES)
 * 위 기본값 하나로 족하다. 표를 남겨 두는 이유는 한도를 정하는 축이 소스마다 다르기 때문이다:
 * 시간이 아니라 **응답 바이트**가 한도를 정하는 소스가 있었다(변경 기록이 게임당 수백 KB).
 */
export const PATCH_LIST_PER_RUN_BY_SOURCE: Partial<Record<Source, number>> = {};
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
 * 패치 기록을 주는 스토어. 나머지가 왜 빠졌는지는 adapters/types 의 listPatchNotes 주석에 실측으로 있다.
 *
 * 이 목록이 상수로 필요한 이유(2026-09-15): "플랫폼별 패치 속도 비교" 는 한 게임이 이 중 **둘 이상**에
 * 기록을 가져야 비로소 비교가 된다. 한 번도 안 물어본 게임부터 도는 순서만으로는 그런 게임이
 * 카탈로그를 한 바퀴 다 돌 때까지(steam 4,660건 기준 약 78일) 한 건도 안 생긴다 —
 * 실제로 2026-09-15 기준 두 칸이 서는 게임이 0건이었다. 양쪽에 다 있는 게임을 먼저 물어본다.
 */
export const PATCH_SOURCES: StoreSource[] = ["steam"];

/**
 * 한 실행에서 사양(steam appdetails)을 새로 물어볼 게임 수.
 *
 * DLC 목록, 패치 기록과 같은 성격의 경로다 — 배치가 없어 게임 1개가 요청 1회다.
 * 그래서 한도의 근거도 같은 자리에서 온다: **Actions 사용 분**이다.
 * 10건 × 요청 간격 1.5초 = 15초. crawl-prices 는 이미 1회 9~15분이고 무료 한도에 붙어 있어
 * (워크플로 주석의 실측) 여기서 크게 가져갈 자리가 없다.
 *
 * **2026-09-18 에 20 에서 10 으로 내렸다.** 이 단계가 크론 예산 계산에서 빠져 있었는데(패치 단계도
 * 같이 빠져 있었다), 세어 보니 steam 이 예산의 109~113% 였다. 두 단계를 식에 넣고 이 값을 반으로
 * 줄여 발견 몫의 손실을 덜었다 — 하루 4회 실행이면 40건이고, 스팀 신규 등록 속도보다 훨씬 빠르다.
 *
 * **이 값으로 백필하지 않는다.** 스팀 본편이 3,493건인데(2026-09-18 실측) 하루 2회 × 20건이면
 * 한 바퀴에 87일이다. 백필은 로컬 회선이 맡는다(scripts/backfill-requirements.ts) —
 * 사양은 1회 백필 + 신규분만이면 되는 축이라 그 둘이 갈리는 것이 자연스럽다.
 * 이 상수가 맡는 것은 그 뒤의 신규분이다.
 */
export const REQUIREMENTS_PER_RUN = 10;
/**
 * 한 번 물어본 게임을 다시 물어보기까지의 간격(일).
 *
 * DLC(30일), 패치(14일)보다 훨씬 길게 잡는다. 사양은 거의 안 변하기 때문이다 —
 * 재발매나 대규모 패치 때만 바뀐다. 짧게 잡으면 얻는 것 없이 카탈로그를 한 바퀴 도는 속도만 느려진다.
 * 180일이면 반년에 한 번인데, 그 사이 바뀐 사양은 몇 달 늦게 반영돼도 손해가 없다.
 */
export const REQUIREMENTS_REFRESH_DAYS = 180;

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

/**
 * 못 붙인 회사 이름을 다시 물을 때까지 쉬는 날(company_lookup_misses.retry_at).
 * 위키데이터는 자라지만 작은 회사 항목이 새로 생기는 속도는 달 단위다. 그보다 짧으면
 * 어제 없던 이름을 매일 다시 묻느라 새 이름을 볼 몫이 사라진다 — 2026-09-30 까지 정확히 그 상태였다.
 */
export const COMPANY_MISS_RETRY_DAYS = 30;

/**
 * 회사 묶음 조회에서 검색 단계를 끊는 시각(실행 시작부터). 묶음 경로는 검색을 전부 끝낸 뒤에야
 * 상세 질의와 DB 쓰기를 하므로, 429 백오프가 겹쳐 함수 상한(800초)에 잘리면 그때까지 찾은 것까지 다 잃는다.
 * 검색을 여기서 멈추고 남은 시간을 상세 질의와 쓰기에 준다. 몫(CRON_META_PLAN)은 이보다 일찍 끝나게 잡혀 있어
 * 평소에는 닿지 않는 안전선이다.
 */
export const COMPANY_SEARCH_DEADLINE_MS = 480_000;

/**
 * 믿을 수 있는 출시일의 범위(연도). 밖에 있으면 값을 버리고 기존 값을 지킨다.
 *
 * 왜 필요한가(2026-09-16 실측): xbox 가 OriginalReleaseDate 로 9998년 58건, 2799년 5건을 준다.
 * "미정" 을 먼 미래로 적는 관행인데, 이대로 두면 출시예정 목록을 출시일순으로 세울 때
 * 그 63건이 영원히 꼬리에 붙고 "가장 먼 출시예정" 같은 집계가 통째로 망가진다.
 *
 * 아래 경계의 근거: 1970 은 상용 비디오 게임이 존재하기 전이고(그보다 이른 값은 epoch 오독이다),
 * 앞으로 10년은 스토어가 실제로 예고하는 최장 구간(보통 1~3년)보다 넉넉하다.
 */
export const RELEASE_DATE_MIN_YEAR = 1970;
export const RELEASE_DATE_MAX_YEARS_AHEAD = 10;

/**
 * 한 실행에서 그 소스에 허용할 매칭(검색) 건수 상한. 적어 두지 않은 소스는 상한이 없다.
 *
 * opencritic 만 있는 이유: 이 API 는 검색에 별도 한도를 매긴다 — 하루 25건이고, 전체 요청 한도(200)와
 * 따로 센다(어댑터 주석의 헤더 실측). 워크플로는 opencritic 과 metacritic 에 같은 --match 값을 주는데
 * 그 값이 150 이라, 상한이 없으면 opencritic 이 매칭 25건째에서 429 를 맞고 그 회차 수집까지 못 한다.
 * 워크플로 값을 내리면 metacritic 매칭까지 같이 굶으므로 여기서 소스별로 깎는다.
 */
export const MATCH_LIMIT_MAX_BY_SOURCE: Partial<Record<Source, number>> = {
  opencritic: 25,
};

/**
 * 상품 매핑 배치(매장 설계서 §5.2)의 값 셋.
 *
 * 후보 수를 5로 둔 이유: 쓰는 것은 1등 하나뿐이지만, 1등만 뽑으면 "2등과 얼마나 벌어졌나" 를
 * 나중에 물을 수 없다. 5는 그 여지를 남기면서 질의 비용이 안 늘어나는 선이다(정렬은 어차피 돈다).
 *
 * 다시 보는 주기가 7일인 이유: 상품이 안 이어지는 까닭은 대개 "그 게임이 아직 카탈로그에 없다" 이고,
 * 발견은 하루 단위로 돈다. 매일 다시 보면 같은 상품에 같은 답을 여섯 번 더 내고, 한 달에 한 번이면
 * 매장이 물건을 올린 뒤 값이 붙기까지 한 달을 기다린다.
 */
export const PRODUCT_MATCH_CANDIDATES = 5;
export const PRODUCT_MATCH_RECHECK_DAYS = 7;
/** 하루 한 번 도는 정리 크론이 한 회차에 볼 상품 수. 네트워크를 안 쓰므로 스토어 몫과 무관하다 */
export const PRODUCT_MATCH_BATCH = 200;

/**
 * 예약 특전 수집(sync/preorder-bonuses)이 한 번에 읽는 뉴스 목록 쪽 수.
 * 특전 글은 월 1건 안팎이고(2026-04~10 실측 여섯 건) 목록 한 쪽이 24건이라, 하루 두 번 1쪽만 보면 놓치지 않는다.
 * 처음 채울 때만 손으로 쪽 수를 늘려 부른다(크론 경로의 ?pages=). 상한은 실측한 여섯 건이 다 들어가는 쪽 수에 여유를 둔 값이다.
 */
export const PREORDER_PAGES_DEFAULT = 1;
export const PREORDER_PAGES_MAX = 12;
/**
 * 상세 화면에 특전을 띄우는 기간. 발매 뒤에도 "재고 소진 시까지" 주는 판매처가 있어 바로 내리지 않고,
 * 한 달이 지나면 남은 재고가 거의 없어 내린다. 발매일을 모르면 계속 띄운다.
 */
export const PREORDER_SHOW_AFTER_RELEASE_DAYS = 30;
