// "역대 최저가" 판정 — 카드, 상세의 배지(game_platforms.historic_low)와 찜 알림(sync/dispatch-wish-alerts)이 같은 규칙을 쓴다.
//
// 왜 기록 기간을 따지나(2026-11-11, 사용자 확정): 가격 기록은 2026-09-11 부터 쌓였다. 기록이 며칠뿐인 상품에서 아무 할인이나
// "역대 최저가" 로 띄우면 금세 거짓말이 되고, 그 한 번에 배지 전체를 믿지 않게 된다. 그래서 기록이 HISTORIC_LOW_MIN_HISTORY_DAYS 이상
// 쌓인 상품에만 말한다. 화면에는 "기록 기준" 같은 단서를 달지 않는다(같은 날 사용자 지정) — 기간 조건이 그 몫을 한다.
//
// 같은 값(동률)도 역대 최저가로 친다. 정기 세일마다 같은 최저가로 돌아오는 게임이 흔하고, 그때도 "지금이 가장 싸다" 는 참이다.
// 값 0 은 세지 않는다 — 값을 못 읽은 회차다(ps-zero-price-snapshots).

/** 이 일수보다 짧은 기록으로는 "역대" 를 말하지 않는다 */
export const HISTORIC_LOW_MIN_HISTORY_DAYS = 60;

const DAY_MS = 24 * 60 * 60 * 1000;

/** 기록이 충분히 길었나. 첫 기록을 모르면 아니다 */
export function longEnoughHistory(firstSeenAt: Date | null, now: Date): boolean {
  return firstSeenAt !== null && now.getTime() - firstSeenAt.getTime() >= HISTORIC_LOW_MIN_HISTORY_DAYS * DAY_MS;
}

/**
 * 지금 값이 역대 최저가인가. lowest 는 지금 값을 포함한 기록의 최저값(0 제외)이다.
 * 할인 중이어야 한다 — 정가가 내려 최저가 된 경우는 "할인" 소식이 아니라 배지를 달지 않는다.
 */
export function isHistoricLow(input: { currentPrice: number | null; discountPct: number | null; lowest: number | null; firstSeenAt: Date | null; now: Date }): boolean {
  const { currentPrice, discountPct, lowest, firstSeenAt, now } = input;
  if (currentPrice === null || currentPrice <= 0 || (discountPct ?? 0) <= 0 || lowest === null) return false;
  return currentPrice <= lowest && longEnoughHistory(firstSeenAt, now);
}
