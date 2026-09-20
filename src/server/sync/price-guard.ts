// §10 파싱 검증 — "이번 배치의 가격을 믿을 수 있는가" 를 판정한다.
//
// 가드가 잡으려는 것은 **스토어 마크업, 응답 형식이 바뀌어 파서가 아무것도 못 읽는 사고**다.
// 그때 반영하면 멀쩡하던 가격이 통째로 null 로 덮이거나 "역대 최저가" 가 거짓으로 박힌다.
//
// 그래서 세는 자리가 중요하다. **값이 없는 게 정상인 항목을 모수에 넣으면 가드가 오작동한다** —
// 2026-09-17 ~ 21 에 실제로 그랬다. 발견의 첫 패스가 출시예정(comingsoon)이고 크론 discover 몫은
// 배치 전부가 신규 시드였다(seedShare: 1). 아직 안 나온 게임은 가격이 없는 게 맞는데 가드가
// "90건 중 90건이 0원/null" 로 읽고 매 실행 반영을 통째로 생략했다. 닷새 동안 하루 두 번,
// 스팀 신규 등록이 0건이었다(sync_logs 확인: 2026-09-17 00:49 첫 기록).
import type { StoreSnapshot } from "@/server/adapters/types";
import { SUSPICIOUS_MIN_SAMPLE, SUSPICIOUS_PRICE_RATIO } from "./constants";

/**
 * 이 항목에 가격이 있어야 하는가.
 *
 * 출시일을 알고 그 날이 지났으면 스토어가 파는 물건이므로 값이 있어야 한다.
 * 출시일이 미래거나 아예 없으면 값이 없는 것이 정상이다 — 판정을 "모른다" 쪽으로 기울인다.
 *
 * **맞바꾼 것**: 마크업이 바뀌어 가격과 출시일을 함께 못 읽는 사고는 모수가 줄어 가드를 빠져나간다.
 * 그 경우에도 피해는 제한적이다 — §7 이 null 로 기존 값을 덮지 않고, 0 은 priceMisread 가 항목별로 막는다.
 * 반대쪽(정상을 사고로 오인)이 훨씬 비쌌다: 그쪽은 멀쩡한 수집을 통째로 멈춘다.
 */
export function expectsPrice(s: StoreSnapshot, today: string): boolean {
  return s.releaseDate !== null && s.releaseDate !== undefined && s.releaseDate <= today;
}

/**
 * 값이 못 미더운 항목인가. **0 은 세지 않는다** — 어댑터가 무료(0)와 미판매(null)를 이미 가른다
 * (steam 의 parse-store-items: `is_free ? 0 : null`). 무료 게임의 0 은 올바로 읽은 값이다.
 * 정가가 있는데 0 으로 읽히는 회차는 배치가 아니라 항목별 사고라 priceMisread 가 따로 막는다.
 */
function unreadable(s: StoreSnapshot): boolean {
  return s.currentPrice === null || s.currentPrice === undefined;
}

export interface PriceGuardVerdict {
  /** 반영을 생략해야 하는가 */
  blocked: boolean;
  /** 가격이 있어야 했던 항목 수 (가드의 모수) */
  expected: number;
  /** 그중 값을 못 읽은 수 */
  unreadable: number;
  /** 모수에서 빠진 수. 로그에 적어 "왜 가드가 안 걸렸나" 를 사후에 알 수 있게 한다 */
  skipped: number;
}

/** 오늘(YYYY-MM-DD). 출시일 비교는 문자열끼리 한다 — ISO 날짜는 사전순이 곧 시간순이다 */
export function isoDay(now: Date): string {
  return now.toISOString().slice(0, 10);
}

export function judgePrices(snapshots: StoreSnapshot[], today: string): PriceGuardVerdict {
  const priceable = snapshots.filter((s) => expectsPrice(s, today));
  const bad = priceable.filter(unreadable).length;
  return {
    blocked: priceable.length >= SUSPICIOUS_MIN_SAMPLE && bad / priceable.length > SUSPICIOUS_PRICE_RATIO,
    expected: priceable.length,
    unreadable: bad,
    skipped: snapshots.length - priceable.length,
  };
}
