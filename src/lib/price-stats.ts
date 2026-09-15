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
 *
 * listPrice 를 받는 이유는 값이 0 인 점을 거르기 위해서다.
 * 2026-09-15 실측: 값이 0 인 스냅샷 14건이 전부 플레이스테이션이었고, 그 행의 정가와 현재가는
 * 멀쩡했다(정가 46,800 현재가 11,700 인데 스냅샷만 0). 스토어 응답을 잘못 읽은 것이다.
 * 거르지 않으면 그 게임이 영영 "역대 최대 할인 100%" 로 박제된다.
 *
 * 맞바꾼 것: 정가가 있는 물건을 진짜 공짜로 푸는 배포(에픽 무료 배포)도 같이 걸러진다.
 * 오독은 나흘에 14건 나왔고 무료 배포는 그보다 드물어서 이쪽을 택했다.
 * 제대로 고치려면 sync 가 값 0 인 스냅샷을 아예 쓰지 않아야 한다.
 */
export function bestDiscountOf(
  points: readonly DiscountPoint[],
  listPrice: number | null = null,
): DiscountPoint | null {
  let best: DiscountPoint | null = null;
  for (const p of points) {
    if (p.discountPct <= 0) continue;
    if (p.price <= 0 && (listPrice ?? 0) > 0) continue;
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
