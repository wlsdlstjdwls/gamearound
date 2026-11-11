// 찜한 게임 할인 알림의 판정(sync/dispatch-wish-alerts). 목표가 알림(lib/alerts/condition)과 따로 두는 이유:
// 목표가 알림은 사람이 건 조건을 보고, 이쪽은 조건 없이 "할인이 붙었다", "기록상 가장 싸다" 두 사실만 본다.
// 찜만 한 사람에게 1원 내린 것까지 알리면 알림이 소음이 된다 — 할인 딱지가 붙은 하락만 센다.

export type WishSaleReason = "sale" | "recordLow";

export type WishSaleInput = {
  previousPrice: number | null;
  newPrice: number;
  discountPct: number;
  /** 이번 스냅샷 전까지 본 가장 낮은 값. 기록이 없으면 null(첫 수집이라 "최저" 를 말할 근거가 없다) */
  priorLowest: number | null;
  /**
   * 기록이 "역대" 를 말할 만큼 길었나(lib/games/historic-low 의 longEnoughHistory). 짧으면 최저를 새로 찍어도 할인 시작으로만 알린다 —
   * 2026-11-11 사용자 확정으로 문구가 "역대 최저가" 가 되면서 생긴 조건이다. 카드, 상세 배지와 같은 잣대다
   */
  longHistory: boolean;
};

/** 알릴 이유. 알리지 않으면 null. 기록상 최저가가 할인 시작보다 강한 말이라 둘 다 맞으면 recordLow 다 */
export function wishSaleReason({ previousPrice, newPrice, discountPct, priorLowest, longHistory }: WishSaleInput): WishSaleReason | null {
  if (previousPrice === null || newPrice >= previousPrice) return null;
  if (discountPct <= 0 || newPrice <= 0) return null;
  if (longHistory && priorLowest !== null && newPrice < priorLowest) return "recordLow";
  return "sale";
}
