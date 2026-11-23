// 긴 글을 읽기 좋은 덩어리(소제목, 문단)로 나눈다 — 게임 설명 팝업(ui/fit-clamp 의 더보기)이 쓴다.
//
// 왜 필요한가(2026-11-23 사용자 "게임 설명 팝업 가독성", 이어서 "♦ 로 시작하는 건 누가 봐도 제목인데 왜 구분 안 했나"):
// 스토어 설명은 줄바꿈 없이 한 덩어리로 오거나, 닌텐도처럼 "♦ 소제목" 줄과 본문 줄이 섞여 온다. 문장을 고치거나 줄이지 않는다 — 나누기만 한다.
//
// 규칙
//  - 줄바꿈이 있으면 줄이 단위다. 표식(♦ ◆ ■ ▶ ★ ●)으로 시작하는 줄, 또는 문장 끝 부호 없이 짧은 줄(HEADING_MAX_CHARS 이하)이고
//    다음 줄이 이어지면 소제목이다. 표식 글자(♦ 등)는 떼지 않는다 — 스토어가 쓴 글자 그대로 보여 준다(2026-11-23 사용자 "특수문자 잘린다")
//  - 줄바꿈 없는 옛 데이터(닌텐도는 2026-11-23 전까지 줄을 띄어쓰기로 이어 저장했다)는 표식 앞에서 문단을 가른다.
//    소제목이 어디서 끝나는지는 알 길이 없어 그 문단은 표식 문단(marked)으로만 둔다 — 다시 수집되면 줄바꿈이 생겨 소제목으로 선다
//  - 표식도 줄바꿈도 없으면 문장 SENTENCES_PER_PARAGRAPH 개씩 묶는다

export type TextBlock = { kind: "heading" | "para" | "marked"; text: string };

/** 줄바꿈 없는 글을 묶을 문장 수. 셋이면 팝업 폭(약 600px)에서 문단이 서너 줄이 된다 */
const SENTENCES_PER_PARAGRAPH = 3;
/** 이보다 긴 줄은 소제목으로 보지 않는다(표식이 없을 때) */
const HEADING_MAX_CHARS = 30;
/** 소제목 표식. 스토어 설명이 쓰는 글머리 글자들 */
const MARKER = /^[♦◆■▶★●]\s*/;
const MARKER_SPLIT = /\s*(?=[♦◆■▶★●]\s)/;
/** 문장 끝: 마침표, 물음표, 느낌표(전각 포함) 다음 띄어쓰기. "1.5배", "v1.2" 처럼 띄어쓰기 없는 점은 끝이 아니다 */
const SENTENCE_END = /(?<=[.?!。！？])\s+/;
const ENDS_SENTENCE = /[.?!。！？]$/;

function bySentences(text: string): TextBlock[] {
  const sentences = text.split(SENTENCE_END).filter(Boolean);
  const out: TextBlock[] = [];
  for (let i = 0; i < sentences.length; i += SENTENCES_PER_PARAGRAPH) out.push({ kind: "para", text: sentences.slice(i, i + SENTENCES_PER_PARAGRAPH).join(" ") });
  return out;
}

export function toBlocks(text: string): TextBlock[] {
  const lines = text
    .split(/\n+/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length > 1) {
    return lines.map((line, i) => {
      const marked = MARKER.test(line);
      const shortTitle = line.length <= HEADING_MAX_CHARS && !ENDS_SENTENCE.test(line) && i < lines.length - 1;
      return marked || shortTitle ? { kind: "heading", text: line } : { kind: "para", text: line };
    });
  }
  const one = lines[0] ?? "";
  const sections = one.split(MARKER_SPLIT).filter(Boolean);
  if (sections.length > 1) {
    return sections.flatMap((sec): TextBlock[] => (MARKER.test(sec) ? [{ kind: "marked", text: sec }] : bySentences(sec)));
  }
  return bySentences(one);
}
