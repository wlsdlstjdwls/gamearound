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

/**
 * 게임 안에서 쓰는 재화, 교환권을 가리키는 낱말.
 *
 * 스토어가 번역해 오는 말만 넣는다 — 실측으로 본 것이 백금화, 화폐, Pitcoin, Car Voucher,
 * Coins, Point 다. 나머지는 같은 갈래라 같이 적었다.
 *
 * `gold` 를 넣어도 되는 이유: 아래 규칙이 **숫자를 함께 요구**한다. "골드 에디션" 에는 숫자가 없다.
 * addon-kind 가 gold, point 를 뺀 것은 그쪽이 숫자를 안 보기 때문이고, 여기는 사정이 다르다.
 */
const CURRENCY_WORDS =
  "백금화|화폐|코인|골드|젬|크리스탈|다이아몬드|포인트|바우처|교환권|coins?|gems?|crystals?|diamonds?|gold|bucks|credits?|tickets?|points?|vouchers?|tokens?|shards?|pitcoin";

/**
 * 숫자와 재화 낱말이 **붙어 있을 때만** 참이다. 어느 쪽이 앞이어도 되고, 괄호로 싸도 된다.
 *   "디아블로 IV — 500 백금화" | "Sao Coins 2100" | "Car Vouchers (24)" | "Forza Horizon 6 Car Voucher 4"
 */
const CURRENCY_PATTERNS = [
  // String.raw 를 쓴다 — 보통 템플릿 리터럴은 `\s` 의 역슬래시를 먹어 버려(JS 가 모르는 이스케이프라)
  // 정규식이 조용히 `s`, `W` 한 글자를 찾게 된다. 오류 없이 아무것도 못 잡고 통과한다.
  new RegExp(String.raw`[0-9][0-9,.]*\s*(` + CURRENCY_WORDS + String.raw`)(\W|$)`, "i"),
  new RegExp(String.raw`(` + CURRENCY_WORDS + String.raw`)\s*[0-9][0-9,.]*(\W|$)`, "i"),
  new RegExp(String.raw`(` + CURRENCY_WORDS + String.raw`)\s*\([0-9]+\)`, "i"),
];

/**
 * 게임 안 재화, 교환권 상품인가 — 본편이 아니다.
 *
 * **숫자를 함께 요구하는 것이 이 규칙의 전부다.** 재화 낱말만으로 가르면 본편을 내린다:
 * 2026-09-21 에 낱말만으로 순위 상위를 훑었을 때 20건 중 13건이 진짜 게임이었다
 * (나라카:블레이드**포인트**, 투 **포인트** 뮤지엄, RAC**COIN**, Dead by Daylight 골드 에디션,
 * 그리고 "세대 호환 번들" 넷 — 그건 PS4 판과 PS5 판을 같이 주는 **본편**이다).
 * 숫자를 요구하면 그 열셋이 전부 빠지고, 카탈로그 전수 26건이 남는다. 그 26건을 눈으로 다 읽었고
 * 전부 진짜 재화였다(F1 Pitcoin 16, Forza Car Voucher 3, Battlefield 화폐 2, 그 외 5).
 *
 * 숫자가 없는 재화 상품은 이 카탈로그에 0건이었다 — 스토어가 수량을 제목에 적기 때문이다.
 * 그 성질이 깨지면 여기가 아니라 스토어가 주는 분류 값을 봐야 한다(파일 머리 주석).
 */
export function isCurrencyItemTitle(title: string | null | undefined): boolean {
  if (!title) return false;
  return CURRENCY_PATTERNS.some((re) => re.test(title));
}
