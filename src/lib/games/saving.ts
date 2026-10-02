// 같은 기기에서 스토어만 바꿔도 아끼는 값 — 카드의 판정 한 줄("Epic Games에서 51,000원 더 싸요")의 근거.
//
// 왜 이 판정인가(2026-10-02): "역대 최저가" 를 먼저 생각했지만 가격 이력이 2026-09-11 부터라 3주뿐이다.
// 30일 넘는 이력을 가진 할인 행이 0건이었다 — 그 위에 "역대" 를 붙이면 과장이다. 이력이 석 달 넘게 쌓이면 다시 본다.
// 스토어 사이 값 차이는 지금 있는 사실이고, 여러 스토어를 한 화면에 모으는 이 서비스만 말할 수 있는 값이다.
// 실측: Steam 과 Epic 값이 둘 다 있는 게임 1,180 중 5,000원 넘게 갈리는 게 355(Total War: WARHAMMER III 는 9,000 대 60,000),
// PS5 와 PS4 가 갈리는 게 1,597 중 684.
//
// **기기가 다른 스토어끼리는 견주지 않는다.** PS5 가 있는 사람에게 "Steam 이 더 싸요" 는 살 수 없는 값이다.
// 같은 기기에서 고를 수 있는 짝만 본다 — PC 는 Steam 과 Epic, PlayStation 은 PS5 판과 PS4 판, 닌텐도도 같다.
import type { Currency, Platform } from "@/server/db/schema";
import { DISPLAY_CURRENCY } from "@/lib/currency";

/** 한 사람이 같은 기기에서 고를 수 있는 스토어 묶음. Xbox 는 스토어가 하나라 짝이 없다 */
export const SAVING_GROUPS: ReadonlyArray<readonly Platform[]> = [
  ["steam", "epic"],
  ["ps5", "ps4"],
  ["switch2", "switch"],
];

/**
 * 판정을 세우는 최소 차이(원). 몇백 원 차이는 반올림 정책 차이라 "더 싸요" 라고 부를 값이 아니다.
 * 5,000 이면 Steam 대 Epic 차이 837건 중 355건이 남는다(2026-10-02 실측)
 */
export const SAVING_MIN_AMOUNT = 5000;

export type StoreSaving = { cheaper: Platform; than: Platform; amount: number; currency: Currency };

/**
 * 묶음마다 가장 싼 스토어와 가장 비싼 스토어의 차이를 재고, 가장 큰 차이 하나를 돌려준다.
 * 기준 통화 값만 본다 — 통화가 다르면 환산 없이 견줄 수 없다(lib/currency).
 * 값을 모르는 행(null)과 0원 행은 뺀다. 0원은 넣었다가 뺐다(2026-10-02 실측): Minecraft 의 PS5 행이 0원으로 와
 * (PS4 판 산 사람의 무료 업그레이드 상품으로 보인다) "PS5에서 22,100원 더 싸요" 와 "무료" 가 함께 섰다.
 * 0원 행은 상품이 무엇인지 우리가 가를 수 없다 — 무료 배포는 값 0 이 아니라 할인율 100 으로 따로 보인다.
 */
export function storeSaving(rows: ReadonlyArray<{ platform: Platform; price: number | null; currency: string }>): StoreSaving | null {
  let best: StoreSaving | null = null;
  for (const group of SAVING_GROUPS) {
    const priced = rows.filter((r): r is { platform: Platform; price: number; currency: string } => group.includes(r.platform) && r.price !== null && r.price > 0 && r.currency === DISPLAY_CURRENCY);
    if (priced.length < 2) continue;
    const low = priced.reduce((a, b) => (b.price < a.price ? b : a));
    const high = priced.reduce((a, b) => (b.price > a.price ? b : a));
    const amount = high.price - low.price;
    if (amount < SAVING_MIN_AMOUNT || low.platform === high.platform) continue;
    if (!best || amount > best.amount) best = { cheaper: low.platform, than: high.platform, amount, currency: DISPLAY_CURRENCY };
  }
  return best;
}
