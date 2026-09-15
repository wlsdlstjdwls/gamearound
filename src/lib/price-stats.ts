// 가격 스냅샷에서 뽑아내는 통계. 순수 함수만 둔다 — DB 도 네트워크도 모른다.
//
// 왜 최저가가 아니라 할인율인가: 원화 정가는 바뀐다. 정가가 오르면 몇 해 전 정가로 찍힌
// "역대 최저가" 는 지금 아무리 깎아도 못 깨는 박제된 숫자가 되어 판단에 쓸모가 없다.
// 할인율은 정가가 바뀌어도 같은 축에 남아서 "이번이 살 때인가" 를 그대로 말해 준다.
//
// 한계: prices 서비스의 downsampleSnapshots 가 90일 지난 스냅샷을 주 1개로 줄인다.
// 정기 세일(1~3주)은 표본이 남지만 며칠짜리 반짝 할인의 최대치는 깎여 나갈 수 있다.
// 그래서 화면은 "기록 기준" 이라고 적는다. 정확한 역대 최대치가 필요해지면
// game_platforms 에 갱신 시점마다 갱신하는 칸을 두는 쪽으로 옮긴다.

/** price_snapshots 한 점. PriceSeries["points"] 가 그대로 맞물린다 */
export type DiscountPoint = {
  t: string;
  price: number;
  discountPct: number;
  discountName: string | null;
};

/**
 * 기록에 남은 가장 큰 할인 한 점. 할인이 한 번도 없었으면 null.
 *
 * 같은 할인율이 여럿이면 더 싼 값을, 그것도 같으면 더 최근 것을 고른다 —
 * 정가가 내려간 뒤의 같은 할인율이 실제로 더 좋은 거래다.
 */
export function bestDiscountOf(points: readonly DiscountPoint[]): DiscountPoint | null {
  let best: DiscountPoint | null = null;
  for (const p of points) {
    if (p.discountPct <= 0) continue;
    if (best === null) {
      best = p;
      continue;
    }
    if (p.discountPct > best.discountPct) best = p;
    else if (p.discountPct === best.discountPct) {
      if (p.price < best.price) best = p;
      else if (p.price === best.price && p.t > best.t) best = p;
    }
  }
  return best;
}

/** 지금 할인율이 기록 기준 최대치와 같은가 — "지금이 가장 쌀 때" 를 말해도 되는지의 근거 */
export function isAtBestDiscount(current: number | null, best: DiscountPoint | null): boolean {
  return best !== null && current !== null && current >= best.discountPct;
}
