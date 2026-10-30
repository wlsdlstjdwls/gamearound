// "(으)로" 고르기(2026-10-30). 업무 상태 이름을 공통코드에서 바꿀 수 있게 되어, 칸마다 적어 둔 조사(TASK_STATUS_TO_PARTICLE)로는 맞출 수 없다.
// 끝 글자에 받침이 없거나 ㄹ 받침이면 "로", 그 밖의 받침이면 "으로". 한글이 아닌 끝 글자(영문, 숫자)는 "로" 로 둔다 — 읽는 소리를 알 수 없다.
const HANGUL_START = 0xac00;
const HANGUL_END = 0xd7a3;
const JONG_COUNT = 28;
/** ㄹ 받침의 종성 번호(유니코드 한글 음절 배열) */
const JONG_RIEUL = 8;

export function roParticle(word: string): "으로" | "로" {
  const ch = word.trim().at(-1)?.charCodeAt(0);
  if (ch === undefined || ch < HANGUL_START || ch > HANGUL_END) return "로";
  const jong = (ch - HANGUL_START) % JONG_COUNT;
  return jong === 0 || jong === JONG_RIEUL ? "로" : "으로";
}
