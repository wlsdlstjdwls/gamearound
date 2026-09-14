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

const EDITION_SUFFIXES = [
  "game of the year edition", "goty edition", "goty", "definitive edition", "deluxe edition",
  "ultimate edition", "complete edition", "gold edition", "premium edition", "standard edition",
  "digital deluxe", "remastered", "remaster", "director's cut", "directors cut", "anniversary edition",
  "collector's edition", "collectors edition", "enhanced edition", "special edition", "edition",
];

/** 소문자, 특수문자 제거, 에디션 접미어 제거, 공백 정리 */
export function normalizeTitle(title: string): string {
  let t = stripDiacritics(title) // ™ 은 NFKD 전에 제거된다 (™ → "tm" 분해 방지)
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9가-힣\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  for (const suf of EDITION_SUFFIXES) {
    if (t.endsWith(" " + suf)) {
      t = t.slice(0, -(suf.length + 1)).trim();
      break;
    }
  }
  return t;
}

/**
 * 검색 질의 정규화 — games.title_en_norm / title_ko_norm 생성 컬럼과 같은 규칙이어야 한다.
 * SQL 쪽: lower(regexp_replace(title, '[^[:alnum:]]+', '', 'g')).
 * C.UTF-8 의 [:alnum:] 은 유니코드 문자·숫자이므로 JS 에서는 \p{L}\p{N} 로 맞춘다.
 * 공백·구두점·™®© 가 사라지므로 "엘든 링" 과 "엘든링", "ELDEN RING:" 이 같은 키가 된다.
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
