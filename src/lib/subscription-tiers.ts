// 구독 등급 사다리 — 한 스토어 행에 붙은 구독들을 화면 칩으로 접는다(2026-11-18 사용자 "플랜 따라 구분, 구분 가능한 건 표기 잘").
//
// 같은 서비스 안의 등급은 아래 등급 카탈로그가 위 등급에 그대로 들어간다(PS Plus 스페셜 게임은 디럭스로도, Game Pass Essential 게임은
// 얼티밋으로도 한다). 그래서 칩은 **포함된 가장 낮은 등급 하나**만 세우고, 맨 위 등급이 아니면 "이상" 을 붙인다.
// 같은 사다리의 칩을 둘 다 세우면("스페셜 포함", "디럭스 포함") 둘 중 하나만 해당하는 것처럼 읽혔다.
//
// 넣지 않은 등급(이유):
// - PS Plus 에센셜: 매달 받아 가는 월간 게임이라 "포함" 과 뜻이 다르다(adapters/psstore/constants 의 PSSTORE_LIST_INCLUSION 주석).
// - Game Pass 프리미엄: 카탈로그 목록 ID 를 아직 못 찾았다(adapters/gamepass 주석). 찾으면 essential 과 console 사이에 끼운다.
// PC Game Pass, EA Play, Ubisoft+ 는 사다리가 아니라 제 칩 하나로 선다.

/** 아래 등급부터 위 등급 순. 키는 subscriptions.key */
export const SUBSCRIPTION_LADDERS: readonly (readonly string[])[] = [
  ["psplus_special", "psplus_deluxe"],
  ["gamepass_essential", "gamepass_console"],
];

/**
 * 다른 구독에 통째로 들어 있는 구독 — 둘 다 붙은 행에서는 안쪽 것을 세우지 않는다(2026-11-23 사용자 "Xbox 는 구독권이 왜 2개나 됨").
 * Game Pass Ultimate 는 PC Game Pass 카탈로그를 품는다. 둘을 나란히 적으면 다른 두 혜택처럼 읽혔다. PC Game Pass 만 붙은 행은 그대로 선다.
 */
export const SUBSCRIPTION_COVERED_BY: Readonly<Record<string, string>> = { gamepass_pc: "gamepass_console" };

export type SubscriptionChip<T extends { key: string }> = { sub: T; orHigher: boolean };

/** 받은 순서를 지키되, 같은 사다리에서는 가장 낮은 등급 하나만 남긴다 */
export function foldSubscriptionTiers<T extends { key: string }>(subs: readonly T[]): SubscriptionChip<T>[] {
  const keys = new Set(subs.map((s) => s.key));
  const out: SubscriptionChip<T>[] = [];
  for (const s of subs) {
    const cover = SUBSCRIPTION_COVERED_BY[s.key];
    if (cover && keys.has(cover)) continue;
    const ladder = SUBSCRIPTION_LADDERS.find((l) => l.includes(s.key));
    if (!ladder) {
      out.push({ sub: s, orHigher: false });
      continue;
    }
    const lowest = ladder.find((k) => keys.has(k));
    if (lowest !== s.key) continue;
    out.push({ sub: s, orHigher: ladder.indexOf(s.key) < ladder.length - 1 });
  }
  return out;
}
