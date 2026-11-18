// 패치 본문(단순 글)을 화면 덩어리로 — 제목 줄, 목록, 문단. 글은 React 가 글자로 그린다(HTML 을 꽂지 않는다).
//
// 입력 꼴은 adapters/steam/clean-patch-body 가 만든 세 가지 줄뿐이다: `## 글`, `- 글`, 보통 줄. 빈 줄이 문단을 가른다.
// 번역문도 같은 꼴이다 — DeepL 에 preserve_formatting 을 줘서 줄머리 표시가 그대로 돌아온다(adapters/translate).
// 순수 함수라 서버, 클라이언트 어디서든 같은 결과다(body-blocks.test).

export type PatchBlock =
  | { kind: "heading"; text: string }
  | { kind: "list"; items: string[] }
  | { kind: "para"; lines: string[] };

const HEADING = /^#{1,6}\s+/;
const ITEM = /^[-*]\s+/;

export function parsePatchBody(text: string): PatchBlock[] {
  const out: PatchBlock[] = [];
  let current: PatchBlock | null = null;
  const close = () => {
    if (current) out.push(current);
    current = null;
  };
  for (const raw of text.split("\n")) {
    const line = raw.trim();
    if (line.length === 0) {
      close();
      continue;
    }
    if (HEADING.test(line)) {
      close();
      out.push({ kind: "heading", text: line.replace(HEADING, "") });
      continue;
    }
    if (ITEM.test(line)) {
      const item = line.replace(ITEM, "");
      if (current?.kind === "list") current.items.push(item);
      else {
        close();
        current = { kind: "list", items: [item] };
      }
      continue;
    }
    if (current?.kind === "para") current.lines.push(line);
    else {
      close();
      current = { kind: "para", lines: [line] };
    }
  }
  close();
  return out;
}

function blockChars(b: PatchBlock): number {
  if (b.kind === "heading") return b.text.length;
  if (b.kind === "list") return b.items.reduce((n, s) => n + s.length, 0);
  return b.lines.reduce((n, s) => n + s.length, 0);
}

/**
 * 접힌 상태로 보일 앞부분. 글자 합이 maxChars 에 닿을 때까지 덩어리를 담고, 목록은 항목 단위로 자른다.
 * 첫 덩어리 하나는 길어도 담는다 — 빈 칸을 보이지 않으려는 것이다. truncated 가 참이면 "더 보기" 를 단다.
 */
export function previewBlocks(blocks: PatchBlock[], maxChars: number): { shown: PatchBlock[]; truncated: boolean } {
  const shown: PatchBlock[] = [];
  let used = 0;
  for (const [i, b] of blocks.entries()) {
    const size = blockChars(b);
    if (i === 0 || used + size <= maxChars) {
      shown.push(b);
      used += size;
      continue;
    }
    if (b.kind === "list") {
      const items: string[] = [];
      for (const it of b.items) {
        if (used + it.length > maxChars) break;
        items.push(it);
        used += it.length;
      }
      if (items.length > 0) shown.push({ kind: "list", items });
    }
    return { shown, truncated: true };
  }
  return { shown, truncated: false };
}
