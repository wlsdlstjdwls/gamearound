// 긴 글을 DeepL 요청 한도 아래로 자른다 — 문단(빈 줄) 경계를 먼저 지키고, 그래도 크면 줄, 문장, 글자 순으로 내려간다.
//
// 왜 문단 경계인가: DeepL 은 한 text 안에서 문맥을 본다. 문장 중간에서 자르면 앞뒤가 따로 옮겨져 어색해진다.
// 자른 조각마다 "앞에 붙던 이음새"(빈 줄, 줄바꿈, 공백)를 같이 들고 다녀서, 번역을 되붙일 때 원문의 줄 모양이 그대로 돌아온다.

export interface TextChunk {
  /** 이 조각 앞에 붙던 이음새. 첫 조각은 빈 문자열이다 */
  joiner: string;
  text: string;
}

/** 이음새의 굵기 순서. 굵은 경계부터 자른다 */
const SEPARATORS = ["\n\n", "\n", ". "] as const;

function splitHard(text: string, max: number): string[] {
  const out: string[] = [];
  for (let i = 0; i < text.length; i += max) out.push(text.slice(i, i + max));
  return out;
}

/**
 * text 를 max 글자 이하 조각으로. 조각을 순서대로 joiner + text 로 이으면 원문과 같다(공백 정리 없음).
 * 빈 글이면 빈 배열이다.
 */
export function chunkForTranslation(text: string, max: number, level = 0): TextChunk[] {
  if (text.length === 0) return [];
  if (text.length <= max) return [{ joiner: "", text }];
  const sep = SEPARATORS[level];
  // 마지막 수단: 경계 없이 글자 수로 자른다(한 문장이 한도보다 긴 경우뿐이다)
  if (sep === undefined) return splitHard(text, max).map((t) => ({ joiner: "", text: t }));

  // ". " 로 가를 때는 마침표를 앞 조각에 남긴다 — 이음새는 공백 하나다
  const keepTail = sep === ". " ? "." : "";
  const joinerOf = sep === ". " ? " " : sep;
  const parts = text.split(sep).map((p, i, all) => (i < all.length - 1 ? p + keepTail : p));

  const out: TextChunk[] = [];
  let buf = "";
  let bufJoiner = "";
  const flush = () => {
    if (buf.length > 0) out.push({ joiner: bufJoiner, text: buf });
    buf = "";
  };
  for (const part of parts) {
    if (part.length > max) {
      // 이 조각 하나가 한도보다 크다 — 모아 둔 것을 내보내고 한 단계 가는 경계로 다시 자른다
      const pending = out.length > 0 || buf.length > 0;
      flush();
      const sub = chunkForTranslation(part, max, level + 1);
      sub.forEach((c, i) => out.push({ joiner: i === 0 ? (pending ? joinerOf : "") : c.joiner, text: c.text }));
      continue;
    }
    if (buf.length === 0) {
      bufJoiner = out.length === 0 ? "" : joinerOf;
      buf = part;
    } else if (buf.length + joinerOf.length + part.length <= max) {
      buf += joinerOf + part;
    } else {
      flush();
      bufJoiner = joinerOf;
      buf = part;
    }
  }
  flush();
  return out;
}

/** 조각별 번역을 원문의 이음새로 되붙인다. translated 는 chunks 와 같은 길이, 같은 순서다 */
export function joinChunks(chunks: readonly TextChunk[], translated: readonly string[]): string {
  return chunks.map((c, i) => c.joiner + (translated[i] ?? "")).join("");
}
