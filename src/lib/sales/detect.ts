// 스팀 정기 세일이 "실제로 열렸는가" 를 수집 데이터로 판정한다. 순수 함수라 서버, 테스트가 같이 쓴다.
//
// 왜 달력만으로 안 되나: 달력(calendar.ts)은 밸브 공지를 옮긴 것이라 "열릴 예정" 이지 "열렸다" 가 아니다.
// 공지가 없는 해는 규칙으로 민 근사라 틀릴 수 있고, 틀린 날짜에 "지금 세일 중" 배너를 띄우면 거짓말이 된다.
//
// 왜 데이터만으로도 안 되나(2026-10-02 실측, price_snapshots 120일):
//   스팀은 할인마다 종료 시각을 주고, 정기 세일 상품은 그 시각이 한 점에 몰린다(가을 세일 1,022행이 2026-10-08 17:00Z).
//   그런데 **평소 주에도 한 점에 654행(09-21), 893행(10-01) 이 몰렸다** — 퍼블리셔 세일이 같은 날 끝나는 일이 흔하다.
//   건수 문턱만으로는 정기 세일과 평범한 주를 못 가른다. 행사명도 전부 "특별 할인" 이라 이름으로도 못 가른다.
//
// 그래서 둘을 겹친다: 달력이 "지금 진행 중" 이라고 하는 회차의 **종료 시각과 정확히 같은 묶음**이
// 문턱 이상 있을 때만 열렸다고 본다. 달력이 틀리면(공지와 다른 날) 묶음이 안 맞아 배너가 안 뜬다 —
// 틀린 배너보다 없는 배너가 낫다.
import { upcomingSales } from "./calendar";

/**
 * 종료 시각이 같은 할인 **본편 게임**이 이만큼은 있어야 세일이 열렸다고 본다(services/sales 가 게임 수로 센다).
 *
 * 20 의 근거: 세일 직후 첫 수집은 서울 크론의 스팀 가격 회차(CRON_PLAN.steam.prices 700건)다.
 * 그 회차는 오래된 행부터 고르므로(store-targets 의 lastSyncedAt 순) 카탈로그에서 무작위에 가깝게 뽑는다.
 * 가을 세일 묶음이 스팀 행 11,222개 중 1,022개(9%)였고 그중 본편이 733개(72%)였다 —
 * 700건이면 약 60행, 본편으로 약 43게임이 잡힌다. 그 절반 아래로 둔다.
 * 종료 시각이 달력과 초까지 같은 묶음이라는 조건이 이미 강해서, 문턱은 "우연히 몇 건" 만 막으면 된다.
 */
export const SALE_DETECT_MIN_ROWS = 20;

/** 할인 중인 게임을 종료 시각으로 묶은 한 덩이 */
export type DiscountCluster = { endsAt: Date; count: number };

export type DetectedSale = {
  /** calendar 의 SteamSale.key — 목록 주소(?event=)에 그대로 실린다 */
  key: string;
  name: string;
  endsAt: Date;
  /** 그 종료 시각에 할인 중인 우리 카탈로그의 스팀 본편 게임 수 */
  count: number;
};

/**
 * 지금 열려 있는 정기 세일. 없으면 null.
 * 진행 중인 회차가 둘 이상이면(겹치는 일은 없지만) 묶음이 큰 쪽을 고른다.
 */
export function detectRunningSale(now: Date, clusters: DiscountCluster[], minRows: number = SALE_DETECT_MIN_ROWS): DetectedSale | null {
  let best: DetectedSale | null = null;
  for (const occ of upcomingSales(now)) {
    if (occ.status !== "running") continue;
    const hit = clusters.find((c) => c.endsAt.getTime() === occ.endsAt.getTime());
    if (!hit || hit.count < minRows) continue;
    if (!best || hit.count > best.count) best = { key: occ.sale.key, name: occ.sale.name, endsAt: occ.endsAt, count: hit.count };
  }
  return best;
}

/** 주소의 세일 키 → 지금 진행 중인 그 회차의 종료 시각. 진행 중이 아니면 null(조건을 안 건다) */
export function runningSaleEndsAt(key: string, now: Date): Date | null {
  const occ = upcomingSales(now).find((o) => o.sale.key === key && o.status === "running");
  return occ ? occ.endsAt : null;
}
