// 제목만 보고 "이건 본편이 아니다" 를 가르는 자리.
//
// **스토어가 알려 주면 여기 오지 않는다.** Xbox 는 ProductKind, PlayStation 은 SKU 의 셋째 칸,
// Steam 은 type 이 답을 준다(각 어댑터). 이 파일은 그 신호가 본편이라고 말하는데 실제로는
// 부속물인, 실측으로 확인한 좁은 구멍만 막는다.
//
// 2026-09-18 실측: 본편으로 앉은 예약 관련 상품 8건 중 **3건만 부속물**이었다.
//   부속물 — "TCG Card Shop Simulator Pre-Order Bonus"(값 없음), "Aniimo Pre-Order Pack: Advanced Edition"(17,000)
//   본편   — "Gears of War: E-Day Pre-Order"(79,800), "The Relic: First Guardian Pre-order"(41,400)
// 값이 본편 값인 것은 **예약 중인 본편**이지 부속물이 아니다. 그래서 "pre-order" 만으로는 못 가른다 —
// 뒤에 붙는 낱말(bonus, pack, content, dlc)이 그 상품이 무엇인지 말한다.
// Xbox 는 이 셋 모두에 ProductKind 를 "Game" 으로 준다(2026-09-18 원문 확인). 스토어가 안 가르는 자리다.

/** 예약 구매에 딸려 오는 부속물을 가리키는 꼬리말. 앞의 "예약" 말과 **함께** 나와야 걸린다 */
const EXTRA_WORDS = ["bonus", "pack", "content", "dlc", "kit", "set"];

const PREORDER_WORDS = ["pre-order", "pre order", "preorder"];

/**
 * 예약 특전, 예약 팩처럼 **본편이 아닌** 예약 관련 상품인가.
 *
 * "예약" 말 하나로는 판단하지 않는다 — 출시 전 본편이 그 이름으로 팔리는 일이 흔하다.
 * 두 낱말이 같이 있을 때만 참이고, 그때도 순서를 본다("Pre-Order Bonus" 는 걸리고
 * "Bonus Pre-Order Edition" 처럼 뒤집힌 말은 걸리지 않는다 — 실물을 본 적 없는 모양까지 지어내지 않는다).
 */
export function isPreOrderExtraTitle(title: string | null | undefined): boolean {
  if (!title) return false;
  const t = title.toLowerCase();
  for (const word of PREORDER_WORDS) {
    const at = t.indexOf(word);
    if (at === -1) continue;
    const tail = t.slice(at + word.length);
    if (EXTRA_WORDS.some((w) => tail.includes(w))) return true;
  }
  return false;
}
