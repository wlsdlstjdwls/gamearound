// 매칭 후보가 "같은 게임의 다른 상품"(체험판, 사운드트랙, VR 판 등)인지 제목으로 가른다.
//
// 왜 따로 두나(2026-11-04): 매칭 대기 큐를 사람이 여덟 회차 판정했는데, 물린 것의 단골이 늘 같았다 —
// "The Isle Tide Hotel Demo", "Shy Cats 2 Demo", 사운드트랙, "Skyrim VR" 처럼 후보 제목에만 상품 갈래 낱말이 붙은 것.
// 유사도가 0.7~0.9 라 pending 으로 올라오고, 사람은 매번 같은 이유로 "아니에요" 를 누른다(match-queue-verdict-rules).
// seriesConflict 와 같은 자리에서 후보를 아예 뺀다 — 체험판을 빼야 같은 검색 결과의 본편이 최선 후보로 올라온다.
//
// 한쪽 방향만 본다: 후보에만 있고 우리 제목에는 없는 낱말일 때만 어긋남이다. 우리 행이 체험판(데모 행), VR 판이면
// 같은 낱말을 단 후보가 맞는 짝이다.
//
// 넣지 않은 것: prologue(본편과 같은 이름으로 따로 파는 무료 게임도 있지만 본편 확장으로 쓰이기도 해 갈린다),
// edition, remaster 류(판본 판정은 사람이 형제 행을 보고 정한다 — 규칙이 다르다).

/** 낱말 단위로 보는 갈래 낱말. 소문자, 구두점을 공백으로 푼 제목의 낱말과 비교한다 */
const KIND_WORDS: readonly (readonly string[])[] = [
  ["demo"],
  ["trial"], // Xbox 가 체험판을 "... Trial" 로 판다(실측 "Asteroids Origin And Geometry Warp Trial")
  ["soundtrack"],
  ["ost"],
  ["artbook"],
  ["art", "book"],
  ["season", "pass"],
  ["vr"],
];
/** 띄어쓰기 없이 붙어 오는 한글, 일본어 표기. 부분 문자열로 본다 */
const KIND_GLUED: readonly string[] = ["体験版", "체험판", "サウンドトラック", "사운드트랙", "아트북"];

function words(title: string): string[] {
  return title
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .split(" ")
    .filter(Boolean);
}

function hasPhrase(ws: readonly string[], phrase: readonly string[]): boolean {
  for (let i = 0; i + phrase.length <= ws.length; i++) {
    if (phrase.every((p, j) => ws[i + j] === p)) return true;
  }
  return false;
}

/** 후보 제목에만 상품 갈래 낱말이 있는가 — 있으면 다른 상품이다 */
export function productKindConflict(ours: string, candidate: string): boolean {
  const ow = words(ours);
  const cw = words(candidate);
  for (const phrase of KIND_WORDS) {
    if (hasPhrase(cw, phrase) && !hasPhrase(ow, phrase)) return true;
  }
  for (const g of KIND_GLUED) {
    if (candidate.includes(g) && !ours.includes(g)) return true;
  }
  return false;
}
