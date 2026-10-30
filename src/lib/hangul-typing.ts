// 한글을 자판으로 치는 순서대로 쪼갠다(타이핑 제목, components/ui/typing-title). "각" 은 "ㄱ", "가", "각" 세 장면이 된다.
//
// 왜 자모 단위인가: 글자가 통째로 하나씩 뜨면 타이핑이 아니라 차례로 나타나는 것처럼 보였다(2026-10-30 사용자 "자음 모음 타이핑 효과로").
// 두벌식 입력기의 조합 순서(초성, 초성 + 중성, 받침)만 따른다. 겹모음(ㅘ), 겹받침(ㄳ)을 한 번 더 가르지 않는다 —
// 장면이 하나 늘 뿐 눈에는 차이가 거의 없고, 제목 한 줄이 그만큼 늦게 끝난다.

/** 완성형 한글 음절 범위(가 ~ 힣). 이 밖의 글자(영문, 숫자, 문장 부호)는 한 장면이다 */
const SYLLABLE_FIRST = 0xac00;
const SYLLABLE_LAST = 0xd7a3;
/** 음절 하나 = 초성 19 x 중성 21 x 종성 28. 유니코드 한글 음절의 배열 규칙 그대로다 */
const MEDIAL_COUNT = 21;
const FINAL_COUNT = 28;
/** 초성 순서의 호환 자모(화면에 홀로 서는 "ㄱ" 꼴). 유니코드 초성 배열과 같은 순서다 */
const INITIAL_JAMO = "ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ";

/** 한 글자를 치는 동안 화면에 차례로 보이는 꼴. 마지막이 완성된 글자다 */
export function jamoStages(ch: string): string[] {
  const code = ch.codePointAt(0) ?? 0;
  if (ch.length !== 1 || code < SYLLABLE_FIRST || code > SYLLABLE_LAST) return [ch];
  const index = code - SYLLABLE_FIRST;
  const initial = Math.floor(index / (MEDIAL_COUNT * FINAL_COUNT));
  const final = index % FINAL_COUNT;
  const open = String.fromCodePoint(code - final);
  const stages = [INITIAL_JAMO[initial], open];
  if (final > 0) stages.push(ch);
  return stages;
}
