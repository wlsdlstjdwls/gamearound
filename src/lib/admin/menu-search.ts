// 관리자 메뉴 검색(2026-11-02, 사용자 "메뉴 검색 기능", SBO 의 프로그램 검색). 순수 함수만 둔다 — 판(nav-search)과 휴대폰 더보기 시트가 같이 쓴다.
//
// 초성으로도 찾는다(ㅅㅍㄷㄹ → 상품등록). 화면 이름이 "스토어매칭승인관리" 처럼 길고 붙여 쓴 말이라 다 치기 번거롭다.
// 초성과 온글자를 섞어도 된다(상ㅍ) — 한 글자씩 "자모만 쳤으면 초성끼리, 아니면 그 글자 그대로" 견준다.
// 한글을 치는 동안(조합 중)에도 바로 걸러진다. SBO 검색은 조합이 끝나야(space+BackSpace) 걸러졌는데, 그 버릇은 따르지 않는다.
//
// 순위는 어디에 걸렸나가 먼저고 같은 자리면 앞쪽에 걸린 것이 먼저다. 이름 앞머리 > 이름 가운데 > 별칭 > 묶음 이름.
// 묶음 이름("상품관리")으로 찾으면 그 묶음 칸이 다 나온다 — 묶음째 훑고 싶을 때 쓴다.

export type MenuEntry = { href: string; label: string; group?: string; keywords?: readonly string[] };

const CHO = "ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ";
const HANGUL_FIRST = 0xac00;
const HANGUL_LAST = 0xd7a3;
/** 한 초성 안의 음절 수(중성 21 x 종성 28) */
const SYLLABLES_PER_CHO = 588;

/** 음절이면 그 초성, 아니면 글자 그대로 */
function choOf(ch: string): string {
  const code = ch.charCodeAt(0);
  if (code < HANGUL_FIRST || code > HANGUL_LAST) return ch;
  return CHO[Math.floor((code - HANGUL_FIRST) / SYLLABLES_PER_CHO)];
}

/** 띄어쓰기, 빗금 같은 구분 글자는 빼고 견준다 — "결제 환불" 로도 "결제/환불관리" 가 걸린다 */
export function normalizeMenuText(s: string): string {
  return s.toLowerCase().replace(/[\s/()\-_.,]+/g, "");
}

/** 질의 글자 q 가 대상 글자 t 에 맞나. q 가 초성 자모면 t 의 초성과 견준다 */
function charMatches(q: string, t: string): boolean {
  if (q === t) return true;
  return CHO.includes(q) && choOf(t) === q;
}

/** 대상 안에서 질의가 처음 맞는 자리. 없으면 -1 */
export function matchIndex(target: string, query: string): number {
  const t = normalizeMenuText(target);
  const q = normalizeMenuText(query);
  if (!q) return 0;
  for (let i = 0; i + q.length <= t.length; i++) {
    let ok = true;
    for (let j = 0; j < q.length; j++) {
      if (!charMatches(q[j], t[i + j])) {
        ok = false;
        break;
      }
    }
    if (ok) return i;
  }
  return -1;
}

/** 걸린 자리의 무게. 작을수록 위다 */
const RANK = { labelStart: 0, label: 1, keyword: 2, group: 3 } as const;
/** 같은 무게 안에서 걸린 자리(글자 수)가 순위를 정한다. 메뉴 이름은 이보다 길지 않다 */
const POSITION_SPAN = 100;

function scoreOf(entry: MenuEntry, query: string): number | null {
  const at = matchIndex(entry.label, query);
  if (at === 0) return RANK.labelStart * POSITION_SPAN;
  if (at > 0) return RANK.label * POSITION_SPAN + at;
  const kw = (entry.keywords ?? []).map((k) => matchIndex(k, query)).filter((i) => i >= 0);
  if (kw.length) return RANK.keyword * POSITION_SPAN + Math.min(...kw);
  if (entry.group) {
    const g = matchIndex(entry.group, query);
    if (g >= 0) return RANK.group * POSITION_SPAN + g;
  }
  return null;
}

/** 질의에 걸린 칸, 순위대로. 빈 질의는 빈 목록이다 — 빈 상태(즐겨찾기, 최근)는 부르는 쪽이 그린다 */
export function searchMenu<T extends MenuEntry>(entries: readonly T[], query: string): T[] {
  if (!normalizeMenuText(query)) return [];
  return entries
    .map((entry, order) => ({ entry, order, score: scoreOf(entry, query) }))
    .filter((r): r is { entry: T; order: number; score: number } => r.score !== null)
    .sort((a, b) => a.score - b.score || a.order - b.order)
    .map((r) => r.entry);
}

/** 최근 목록에 하나를 앞에 올린다. 같은 것은 한 번만, 넘치면 뒤에서 버린다 */
export function pushRecent(list: readonly string[], href: string, max: number): string[] {
  return [href, ...list.filter((h) => h !== href)].slice(0, max);
}
