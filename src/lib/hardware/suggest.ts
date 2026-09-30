// 부품 입력칸의 제안 목록 — 친 글자로 사전을 거른다. 네트워크도 화면도 모르는 순수 함수다.
//
// 브라우저 datalist 를 걷고 이걸 쓰는 이유(2026-09-30 사용자 지적): datalist 는 모양을 못 바꾼다 —
// 크롬은 회색 시스템 목록을 칸 폭과 상관없이 띄우고, 사파리 모바일은 자판 위 띠로 몇 개만 보여 준다.
// 거르는 규칙도 브라우저마다 달라("rtx4060" 과 "RTX 4060" 이 한쪽에서만 걸린다) 같은 사전이 기기마다 다르게 보였다.
//
// 비교는 사전 열쇠(normalizeModelKey)끼리 한다 — 매칭기가 사양 문구를 알아보는 그 규칙이라
// 여기서 고른 이름은 저장할 때도 같은 모델로 읽힌다. 낱말마다 따로 찾는 이유: "4060 rtx" 처럼
// 순서를 바꿔 쳐도, "ti 4060" 처럼 꼬리부터 쳐도 걸려야 한다.
import { normalizeModelKey } from "./normalize";

export type SuggestOption = { key: string; name: string };

export function suggestModels<T extends SuggestOption>(options: readonly T[], query: string, limit: number): T[] {
  const tokens = query
    .split(/\s+/)
    .map(normalizeModelKey)
    .filter(Boolean);
  // 빈 칸이면 사전 순서(티어 높은 것부터) 그대로 앞에서 자른다 — 요즘 부품을 고르는 사람이 제안이 필요한 쪽이다
  if (tokens.length === 0) return options.slice(0, limit);

  const hits = options.filter((o) => tokens.every((t) => o.key.includes(t)));
  // 첫 낱말로 **시작하는** 이름을 앞에 세운다 — "1060" 을 친 사람에게 "GTX 1060" 이 "GTX 10600K" 같은 것보다 먼저다.
  // 정렬은 안정적이라 같은 무리 안에서는 사전 순서가 그대로 남는다
  const head = tokens[0];
  const starts = (o: T) => (o.key.startsWith(head) ? 0 : 1);
  return [...hits].sort((a, b) => starts(a) - starts(b)).slice(0, limit);
}
