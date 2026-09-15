// 시간당 가격 — 값 계산과 "싼 편인지" 판정. 순수 함수만 둔다(분포를 뜨는 일은 server/services 가 한다).
//
// 숫자 하나로는 살지 말지 못 정한다. 441원이 싼지 비싼지는 다른 게임을 알아야 나오는 말이고,
// 그 비교 기준을 화면마다 다르게 잡으면 같은 게임이 화면마다 다른 평가를 받는다. 그래서 여기 한 곳에 둔다.
import type { Currency } from "@/server/db/schema";

/**
 * 카탈로그의 시간당 가격 분포. 축을 그리고 판정을 내리는 데 필요한 값만 담는다.
 * 백분위를 쓰는 이유: 평균은 5,000시간짜리 몇 개와 무료 직전 가격 몇 개에 통째로 끌려간다.
 */
export type PricePerHourScale = {
  /** 이 분포를 만든 통화. 다른 통화의 가격은 이 축에 얹지 않는다(환산 금지 — lib/currency) */
  currency: Currency;
  /** 분포를 만든 게임 수 */
  sampleSize: number;
  /** 하위 25% 경계 — 이보다 싸면 "싼 편" */
  q1: number;
  /** 중간값. 축 위 기준선으로 그린다 */
  median: number;
  /** 상위 25% 경계 — 이보다 비싸면 "비싼 편" */
  q3: number;
  /** 축의 오른쪽 끝(상위 10% 경계). 최댓값으로 끊으면 축의 99%가 빈칸이 된다 */
  axisMax: number;
};

/**
 * 이만큼은 모여야 "싼 편" 이라는 말을 할 수 있다고 본 수.
 * 표본이 수십 개면 크롤 한 번에 경계가 흔들려, 어제 "싼 편"이던 게임이 오늘 "비싼 편"이 된다.
 * 그때는 축을 접고 숫자만 말한다.
 */
export const PER_HOUR_MIN_SAMPLE = 200;

/** 마커가 축 끝에 걸쳐 잘리지 않도록 양끝에 남기는 여백(%) */
const MARKER_EDGE_PCT = 2;

/** 두 눈금의 거리가 이보다 가까우면 라벨이 서로 겹친다 — 그때는 중간값 라벨을 접는다(%) */
export const PER_HOUR_LABEL_GAP_PCT = 16;

/**
 * 메인 스토리 기준 시간당 가격. 값이 하나라도 없으면 null 이고 화면은 그 줄 자체를 숨긴다.
 * 가격은 통화의 최소 단위 정수라 나눈 값도 같은 단위다(KRW 26,460 / 60 = 441원).
 */
export function pricePerHour(price: number | null | undefined, hours: number | null | undefined): number | null {
  if (price === null || price === undefined || price <= 0) return null;
  if (hours === null || hours === undefined || hours <= 0) return null;
  return Math.round(price / hours);
}

/** numeric 컬럼은 문자열로 온다 — 양수만 값으로 친다(0, 음수, NaN 은 값 없음) */
export function toPositiveNumber(v: string | number | null | undefined): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export type PerHourVerdict = "cheap" | "mid" | "pricy";

/**
 * 분포 안에서의 자리. 경계값은 아직 그 편이 아니다 —
 * q1 과 정확히 같은 값을 "싼 편"으로 부르면 표본이 조금만 움직여도 판정이 뒤집힌다.
 */
export function perHourVerdict(value: number, scale: PricePerHourScale): PerHourVerdict {
  if (value < scale.q1) return "cheap";
  if (value > scale.q3) return "pricy";
  return "mid";
}

/**
 * 축 위 위치(0~100). 축 밖으로 나간 값은 끝에 붙여 세운다 —
 * 상위 10%를 잘라 낸 축이라 비싼 게임은 원래 오른쪽 끝에 몰리는 것이 맞다.
 */
export function perHourPosition(value: number, axisMax: number): number {
  if (!Number.isFinite(axisMax) || axisMax <= 0) return MARKER_EDGE_PCT;
  const pct = (value / axisMax) * 100;
  return Math.min(100 - MARKER_EDGE_PCT, Math.max(MARKER_EDGE_PCT, pct));
}

/**
 * 이 게임을 축에 얹어도 되는가. 통화가 다르면 얹지 않는다(환산하지 않기로 했다),
 * 표본이 적어도 얹지 않는다. 둘 중 하나라도 걸리면 화면은 숫자만 말하고 축은 그리지 않는다.
 */
export function canPlaceOnScale(currency: Currency, scale: PricePerHourScale | null): scale is PricePerHourScale {
  if (!scale) return false;
  return scale.currency === currency && scale.sampleSize >= PER_HOUR_MIN_SAMPLE && scale.axisMax > 0;
}
