// Xbox 상품의 Properties.Categories → 우리 장르 어휘.
//
// 왜 따로 옮기나: Xbox 는 한국 시장으로 물어도 갈래를 영문으로 준다("Action & adventure", "Role playing", 2026-11-16 실측 xbox-product 픽스처).
// 그대로 저장하면 장르 칩에 "액션" 옆에 "Action & adventure" 가 따로 선다(lib/genres 머리 주석과 같은 사고).
// 그래서 모르는 갈래는 버린다 — lib/genres.normalizeGenre 는 모르는 이름을 살리지만, 여기는 어휘가 닫혀 있고 영문이라 살리면 칩만 늘어난다.
//
// 장르를 이 어댑터가 주지 않던 동안 Xbox 쪽 본편 4,935건 중 4,751건이 장르 없이 남았다(11-16 실측).

/** Xbox 갈래 → 우리 장르. 하나가 둘로 갈리는 것("Action & adventure")은 둘 다 단다. 이름은 스팀에서 들어와 이미 쓰는 말이다 */
const XBOX_CATEGORY_GENRES: Record<string, readonly string[]> = {
  "action & adventure": ["액션", "어드벤처"],
  "card & board": ["보드"],
  educational: ["학습"],
  "family & kids": ["캐주얼"],
  fighting: ["격투"],
  music: ["음악"],
  platformer: ["액션"],
  "puzzle & trivia": ["퍼즐"],
  "racing & flying": ["레이싱"],
  "role playing": ["RPG"],
  shooter: ["슈팅"],
  simulation: ["시뮬레이션"],
  sports: ["스포츠"],
  strategy: ["전략"],
  word: ["퍼즐"],
  other: ["기타"],
};

export function xboxGenres(categories: readonly string[] | null | undefined): string[] {
  const out = (categories ?? []).flatMap((c) => XBOX_CATEGORY_GENRES[c.trim().toLowerCase()] ?? []);
  return Array.from(new Set(out));
}
