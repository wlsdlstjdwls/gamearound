// Xbox 상품 소개글 고르기.
//
// 왜 긴 소개로 물러서나(2026-11-16 실측): 짧은 소개(ShortDescription)가 비고 긴 소개(ProductDescription)만 있는 상품이 많다.
// Xbox 출신 본편 중 설명이 빈 1,360건에서 견본 5개를 다시 물었더니 다섯 다 짧은 소개가 null 이거나 "" 였고 긴 소개는 있었다.
// 긴 소개는 기능 나열, 판매 안내까지 이어지는 긴 글이라 통째로 쓰지 않고 첫 문단만, 길면 문장 끝에서 자른다 —
// 상세 화면은 설명을 몇 줄로 줄여 보이므로(game-detail/hero) 스팀 짧은 소개와 비슷한 길이가 맞다.

/** 첫 문단이 이보다 길면 이 안의 마지막 문장 끝에서 자른다. 스팀 short_description 상한(300자 남짓)에 맞췄다 */
export const XBOX_DESC_MAX_CHARS = 300;
/** 문장 끝으로 보는 글자. 이 안에서 끝을 못 찾으면 글자 수로 자르고 말줄임표를 단다 */
const SENTENCE_END = /[.!?。！？](?=\s|$)/g;

function firstParagraph(text: string): string {
  return (text.split(/\r?\n\s*\r?\n|\r?\n/).map((p) => p.replace(/\s+/g, " ").trim()).find((p) => p.length > 0) ?? "").replace(/^[・•\-*]\s*/, "");
}

function clip(text: string): string {
  if (text.length <= XBOX_DESC_MAX_CHARS) return text;
  const head = text.slice(0, XBOX_DESC_MAX_CHARS);
  const ends = [...head.matchAll(SENTENCE_END)];
  const last = ends.at(-1);
  return last?.index ? head.slice(0, last.index + 1) : `${head.trimEnd()}…`;
}

export function xboxDescription(short: string | null | undefined, long: string | null | undefined): string | null {
  const s = short?.trim();
  if (s) return s;
  const p = long ? firstParagraph(long) : "";
  return p ? clip(p) : null;
}
