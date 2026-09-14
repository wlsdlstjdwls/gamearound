// 순수 유틸: slug 생성, 제목 정규화, 유사도 (§4.2 매칭)

/**
 * 악센트 제거용 NFKD 는 한글 음절도 자모(U+1100~)로 분해한다. 그 상태에서 [^a-z0-9가-힣] 로 거르면
 * 한국어 제목이 통째로 빈 문자열이 된다 → 서로 다른 한국어 제목이 유사도 1.0 으로 auto 매칭되고,
 * slug 는 전부 "game" 으로 충돌한다. 분해된 자모를 NFC 로 도로 합친 뒤에 걸러야 한다.
 */
function stripDiacritics(input: string): string {
  return input.replace(/[™®©]/g, "").normalize("NFKD").replace(/[̀-ͯ]/g, "").normalize("NFC");
}

export function slugify(input: string): string {
  return stripDiacritics(input)
    .toLowerCase()
    .replace(/[^a-z0-9가-힣]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "game";
}

/** slug 충돌 시 접미어 부착 */
export function slugWithSuffix(base: string, suffix: string | number): string {
  return `${base}-${suffix}`;
}

/**
 * 에디션 접미어 — 긴 것부터 둔다. "game of the year edition" 이 "edition" 보다 먼저 걸려야
 * "game of the year" 가 제목에 남지 않는다.
 */
const EDITION_SUFFIXES = [
  "game of the year edition", "goty edition", "goty", "definitive edition", "deluxe edition",
  "ultimate edition", "complete edition", "gold edition", "premium edition", "standard edition",
  "digital deluxe", "remastered", "remaster", "director's cut", "directors cut", "anniversary edition",
  "collector's edition", "collectors edition", "enhanced edition", "special edition",
];

/**
 * 제목 뒤에 붙는 실행 플랫폼 표시. Xbox 카탈로그는 같은 게임의 PC 판을 "(Windows)" 로 구분해
 * 별개 SKU 로 내보낸다 — 우리에게는 같은 게임이므로 매칭 전에 지운다.
 */
const PLATFORM_MARKERS = /\s*\((?:windows|pc|xbox one|xbox series x\|s|xbox series x\/s|nintendo switch|switch)\)/gi;

/**
 * 구분자 뒤에 에디션 이름이 오는 형태를 지운다:
 *   "... 4 - Vault Edition", "...: Ultimate Edition", "... – 지옥불 에디션"
 * 구분자를 경계로 삼는 이유: 정규화로 구두점을 지운 뒤에는 어디까지가 에디션 이름인지 알 수 없다.
 * 에디션 이름은 두 낱말까지만 본다 — 더 넓히면 "Halo: Combat Evolved Anniversary Edition" 이 "Halo" 로 깎인다
 * (그 형태는 아래 접미어 목록이 "anniversary edition" 만 떼어 제대로 처리한다).
 */
const EDITION_TAIL = /\s[-–—:]\s(?:\S+\s){0,2}(?:edition|에디션)\s*$/i;

/** 구분자 없이 붙는 꼬리("Vault Edition", "볼트 에디션") — 에디션 낱말과 그 앞 한 낱말까지 지운다 */
const LOOSE_EDITION_TAIL = /\s(?:\S+\s)?(?:edition|에디션)$/;

/** 소문자, 특수문자 제거, 플랫폼 표시와 에디션 접미어 제거, 공백 정리 */
export function normalizeTitle(title: string): string {
  // 구두점을 지우기 전에 에디션 꼬리부터 떼어낸다 — 구분자가 사라지면 경계를 못 찾는다
  let head = stripDiacritics(title).replace(PLATFORM_MARKERS, "");
  while (EDITION_TAIL.test(head)) head = head.replace(EDITION_TAIL, "");

  const t = head
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9가-힣\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  for (const suf of EDITION_SUFFIXES) {
    if (t.endsWith(" " + suf)) return t.slice(0, -(suf.length + 1)).trim();
  }
  // 목록에 없는 에디션 이름(볼트, 지옥불, Infernal...)까지 걷어낸다.
  // 낱말 하나만 지우는 이유: 더 지우면 "Halo: The Master Chief Collection" 같은 정상 제목을 깎아낸다.
  // 남는 것이 한 낱말뿐이면 지우지 않는다 — 흔한 낱말 하나는 엉뚱한 게임과 붙는다("Vault Edition" → "vault")
  const loose = t.replace(LOOSE_EDITION_TAIL, "").trim();
  return loose.includes(" ") ? loose : t;
}

/**
 * 검색 질의 정규화 — games.title_en_norm / title_ko_norm 생성 컬럼과 같은 규칙이어야 한다.
 * SQL 쪽: lower(regexp_replace(title, '[^[:alnum:]]+', '', 'g')).
 * C.UTF-8 의 [:alnum:] 은 유니코드 문자, 숫자이므로 JS 에서는 \p{L}\p{N} 로 맞춘다.
 * 공백, 구두점, ™®© 가 사라지므로 "엘든 링" 과 "엘든링", "ELDEN RING:" 이 같은 키가 된다.
 */
export function normalizeForSearch(input: string): string {
  return input.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "");
}

function trigrams(s: string): Set<string> {
  const padded = `  ${s} `;
  const out = new Set<string>();
  for (let i = 0; i < padded.length - 2; i++) out.add(padded.slice(i, i + 3));
  return out;
}

/** pg_trgm 방식과 유사한 trigram Jaccard 유사도 (0~1) */
export function trigramSimilarity(a: string, b: string): number {
  const ta = trigrams(normalizeTitle(a));
  const tb = trigrams(normalizeTitle(b));
  if (ta.size === 0 || tb.size === 0) return 0;
  let inter = 0;
  for (const g of ta) if (tb.has(g)) inter++;
  const union = ta.size + tb.size - inter;
  return union === 0 ? 0 : inter / union;
}
