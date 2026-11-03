// 뉴스 제목으로 게임을 찾는다(순수 함수). 수집(sync/run-news)과 다시 맞추기(scripts/rematch-news)가 같이 쓴다.
//
// 2026-11-03 실측 전까지는 "제목 글자가 들어 있으면" 붙였다. 30일 치 1,132건 중 약 340건이 엉뚱했다 —
// "World of Warcraft" 가 게임 "Raft" 에, "Rockstar" 가 "Rock" 에, "Developer" 가 "Velo" 에 붙었고,
// 그 뉴스가 게임 상세 뉴스 칸에 그대로 떴다. 그래서 규칙이 셋이 됐다.
//
// 1. 단어 단위로만 맞춘다. 앞뒤가 글자, 숫자면 같은 낱말이 아니다.
//    한글로 끝나는 제목만 뒤쪽에 한글이 붙어도 된다 — "블루 아카이브가" 처럼 조사가 붙는다.
// 2. 짧은 제목은 일반 말과 겹친다. 한 낱말("Survival", "Perfect", "Easter")도, 두 낱말("The Company", "A New Home")도 그렇다.
//    관사(the, a, an)를 떼고 낱말이 SHORT_TITLE_MAX_WORDS 개 이하면 이름이 알려진 게임(known)만 붙인다.
//    알려짐의 근거는 부르는 쪽이 DB 에서 센다(sync/constants 의 NEWS_MATCH_KNOWN_*).
//    실측에서 맞게 붙은 한 낱말 제목(Minecraft, Palworld, Balatro, DOOM)은 거의 다 이 신호가 있었고, 틀린 것은 거의 다 없었다.
//    두 낱말까지 넓힌 것은 다시 맞추기 dry-run(2026-11-03)에서 "the company", "a new home" 이 새로 붙는 것을 보고서다.
// 3. 단, 한글 기사 제목에서 따옴표 안에 든 짧은 제목은 알려지지 않아도 붙인다. 국내 매체는 게임 이름을 '팽토피아' 처럼
//    따옴표로 감싼다 — 작은 국산 게임은 인기 신호가 없어서, 이 길이 없으면 국내 뉴스는 거의 안 붙는다.
//    영문 기사에는 이 길을 열지 않는다. 영문 제목의 따옴표는 대개 발언 인용이라("'Please give Novus one more chance'") 게임 이름의 표지가 아니다.
//
// 하지 않기로 한 것: 영어 사전으로 일반 낱말을 거르는 일. 사전을 들여야 하고, "Inside", "Grounded" 처럼
// 알려진 게임이면서 일반 낱말인 경우는 사전으로도 못 가른다. 애매하면 붙이지 않는 쪽이 낫다(빈 뉴스 칸이 틀린 뉴스보다 낫다).

/** 이보다 짧은 제목은 단어 단위여도 붙이지 않는다("Go", "Rez" 같은 이름은 문장 안 낱말과 구별이 안 된다) */
export const NEWS_MATCH_MIN_TITLE_LEN = 4;

export interface NewsMatchTarget {
  id: string;
  slug: string;
  /** 소문자로 낮춘 제목들(영문, 한글) */
  needles: string[];
  /** 이름이 알려진 게임인가 — 짧은 제목을 붙여도 되는지 가른다(파일 머리 규칙 2) */
  known: boolean;
}

const LETTER_OR_DIGIT = /[\p{L}\p{N}]/u;
const HANGUL = /\p{Script=Hangul}/u;
/** 게임 이름을 감싸는 따옴표들. 국내 매체는 홑낫표 대신 작은따옴표(곧은 것, 굽은 것)를 쓴다 */
const QUOTES = new Set(["'", "\"", "‘", "’", "“", "”", "「", "」", "『", "』"]);

/** 관사를 뗀 낱말 수가 이 이하면 짧은 제목이다(규칙 2). 세 낱말("Phantom Blade Zero")부터는 우연히 겹치는 일이 드물다 */
const SHORT_TITLE_MAX_WORDS = 2;
/** 낱말 수를 셀 때 빼는 앞머리 관사. 제목은 이미 소문자다 */
const LEADING_ARTICLE = /^(the|a|an)\s+/;

function isShortTitle(needle: string): boolean {
  return needle.replace(LEADING_ARTICLE, "").split(/\s+/).filter(Boolean).length <= SHORT_TITLE_MAX_WORDS;
}

/** hay 안의 at 자리에서 needle 이 낱말로 서 있는가. 서 있으면 따옴표에 싸였는지도 돌려준다 */
function standsAlone(hay: string, at: number, needle: string): { ok: boolean; quoted: boolean } {
  const before = at > 0 ? hay[at - 1] : "";
  const after = hay[at + needle.length] ?? "";
  if (before && LETTER_OR_DIGIT.test(before)) return { ok: false, quoted: false };
  const endsHangul = HANGUL.test(needle[needle.length - 1]);
  // 한글로 끝나면 뒤에 조사(한글)는 붙어도 된다. 라틴 글자, 숫자가 붙으면 다른 낱말이다
  if (after && LETTER_OR_DIGIT.test(after) && !(endsHangul && HANGUL.test(after))) return { ok: false, quoted: false };
  return { ok: true, quoted: QUOTES.has(before) && (QUOTES.has(after) || (endsHangul && HANGUL.test(after))) };
}

/** needle 이 hay 어딘가에 낱말로 서 있는가. 짧은 제목이면 알려졌거나 (한글 기사에서) 따옴표 안이어야 한다 */
function matches(hay: string, needle: string, known: boolean): boolean {
  const short = isShortTitle(needle);
  const quoteCounts = HANGUL.test(hay);
  for (let at = hay.indexOf(needle); at !== -1; at = hay.indexOf(needle, at + 1)) {
    const { ok, quoted } = standsAlone(hay, at, needle);
    if (ok && (!short || known || (quoteCounts && quoted))) return true;
  }
  return false;
}

/** 뉴스 제목에 붙일 게임. 여러 개가 맞으면 가장 긴 제목의 게임("Elden Ring Nightreign" 이 "Elden Ring" 을 이긴다). 없으면 null */
export function matchNewsToGame<T extends NewsMatchTarget>(title: string, index: readonly T[]): T | null {
  const hay = title.toLowerCase();
  let best: { game: T; len: number } | null = null;
  for (const g of index) {
    for (const needle of g.needles) {
      if (needle.length < NEWS_MATCH_MIN_TITLE_LEN) continue;
      if (best && needle.length <= best.len) continue;
      if (matches(hay, needle, g.known)) best = { game: g, len: needle.length };
    }
  }
  return best?.game ?? null;
}
