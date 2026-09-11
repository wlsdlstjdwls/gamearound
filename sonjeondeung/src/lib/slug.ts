// 순수 유틸: slug 생성, 제목 정규화, 유사도 (§4.2 매칭)

export function slugify(input: string): string {
  return input
    .replace(/[™®©]/g, "")
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
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
  let t = title
    .replace(/[™®©]/g, "") // NFKD 전에 제거 (™ → "tm" 분해 방지)
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
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
