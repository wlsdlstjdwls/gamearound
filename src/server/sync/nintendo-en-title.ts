// 한국 닌텐도에서만 들어온 게임의 영문 이름을 되찾는다 — 판정만 하는 순수 함수(쓰기는 scripts/backfill-nintendo-en-titles).
//
// 왜 필요한가(2026-11-10 실측): 한국 eShop 은 한글 이름만 준다. 그래서 닌텐도에서만 들어온 본편 1,642개는
// title_en 칸에도 한글이 들어 있었고, 플레이타임(HLTB), 평점(메타크리틱, 오픈크리틱)은 영문 사이트라 제목 검색이
// 전부 빈손이었다(HLTB 247번 시도에 1건). 사용자 "젤다의 전설 시간의 오카리나에 평점도 플레이타임도 없다".
//
// 영문 이름은 두 군데서 얻는다.
// 1. 스위치 타이틀 DB(titledb): 한국 nsuid 로 타이틀 ID(0100...)를 찾고, 같은 ID 의 미국, 영국 상품 이름을 쓴다.
//    타이틀 ID 는 나라와 상관없이 같은 소프트에 하나다(nsuid 는 나라마다 다르다 — adapters/nintendo/constants 머리).
// 2. 한국 표기 안의 영문 괄호: "버서크 보이 (Berserk Boy)", "High Sea Saga DX(대해적 스토리DX)". 1 에 없을 때만 쓴다.
//    홍콩판 이름의 영문 괄호도 같은 규칙이다("時尚造夢（Fashion Dreamer）") — 아시아판 전용 타이틀 ID 는 미국, 영국에 없고 홍콩에만 있다.
// 3. 구분자로 나란히 적은 표기: "극장 불안 | Theater Unrest", "Maneater - 맨이터", "Alchemist Adventure/알케미스트 어드벤처".
// 4. 한글 앞에 먼저 적은 영문: "Nexomon: Extinction 넥소몬: 멸종", "ZUMBA® Burn It Up!　신가격판".
//    한글 **뒤** 영문은 받지 않는다(2026-11-11 남은 283건 실측) — "데스 엔드 리퀘스트 Code Z", "버디 미션 BOND",
//    "용의 별 바르니르 - Ecdysis of the dragon" 처럼 부제나 꼬리말 조각이라 검색이 엉뚱한 게임을 잡는다.
import { cleanStoreTitle } from "@/lib/store-text";
import { hasHangul } from "@/lib/slug";

/** 영문 이름으로 받아 줄 최소 라틴 글자 수. "VR", "X" 같은 조각이 괄호에서 뽑혀 이름을 대신하지 않게 한다 */
const MIN_LATIN_LETTERS = 3;

/** 가나, 한자. 일본판 이름이 영문 자리에 들어오면 검색이 또 빈손이다 */
const CJK = /[぀-ヿ㐀-鿿]/;

/** 영문 이름으로 쓸 수 있는 값인가 */
export function isUsableEnglishTitle(title: string | null | undefined): title is string {
  if (!title) return false;
  if (hasHangul(title) || CJK.test(title)) return false;
  return (title.match(/[A-Za-z]/g)?.length ?? 0) >= MIN_LATIN_LETTERS;
}

/** "한글 (English)" 또는 "English (한글)" 꼴에서 영문 쪽. 그런 꼴이 아니면 null */
export function englishFromParens(title: string): string | null {
  const m = title.match(/^(.*?)\s*[(（]([^()（）]*)[)）]\s*$/);
  if (!m) return null;
  const [outside, inside] = [m[1].trim(), m[2].trim()];
  if (isForeignScript(outside) && isUsableEnglishTitle(inside)) return inside;
  if (isForeignScript(inside) && isUsableEnglishTitle(outside)) return outside;
  return null;
}

/** 홍콩판 괄호에 영문 이름 대신 붙는 판매 꼬리표("Retail Only", "Asia Version") */
const HK_NOTE = /\b(only|version|ver\.|edition)\b/i;

/** 홍콩판 이름의 영문 괄호. 이름이 아니라 판매 꼬리표면 버린다 */
export function englishFromHongKongName(name: string): string | null {
  const en = englishFromParens(name);
  return en && !HK_NOTE.test(en) ? en : null;
}

/** 한글, 가나, 한자 중 하나라도 있는가. 괄호 바깥이 이 글자면 괄호 안 영문이 그 번역이다 */
function isForeignScript(text: string): boolean {
  return hasHangul(text) || CJK.test(text);
}

/** 두 이름을 대등하게 나란히 적는 구분자. 어느 쪽이 영문이어도 받는다 */
const SIDE_BY_SIDE = /\s*[|/｜]\s*/;
/** 띄어쓴 하이픈. 붙여 쓴 "Spider-Man" 은 가르지 않는다.
 *  영문이 **앞**일 때만 받는다 — 뒤쪽 영문은 "용의 별 바르니르 - Ecdysis of the dragon"(부제),
 *  "버거체인 스토리 (...) – Nintendo Switch 2 Edition"(판 이름)처럼 이름이 아니었다(2026-11-11 실측) */
const DASH = /\s+[-–—]\s+/;
/** 겹낫표 따위가 반쪽만 남은 조각은 이름이 아니다("Bō: Path of the Teal Lotus》DIGITAL DELUXE EDITION") */
const STRAY_BRACKET = /[《》「」『』【】]/;

function twoSides(title: string, sep: RegExp): [string, string] | null {
  const parts = title.split(sep).map((p) => p.trim());
  return parts.length === 2 ? [parts[0], parts[1]] : null;
}

const usableSide = (text: string) => isUsableEnglishTitle(text) && !STRAY_BRACKET.test(text);

/** "한글 | English", "English / 한글", "English - 한글" 꼴에서 영문 쪽. 정확히 두 쪽일 때만 */
export function englishFromSplit(title: string): string | null {
  const even = twoSides(title, SIDE_BY_SIDE);
  if (even) {
    const [a, b] = even;
    if (hasHangul(a) && usableSide(b)) return b;
    if (hasHangul(b) && usableSide(a)) return a;
  }
  const dash = twoSides(title, DASH);
  if (dash && hasHangul(dash[1]) && usableSide(dash[0])) return dash[0];
  return null;
}

/** 첫 한글 앞까지의 영문. 한글과 띄어쓰기나 물결, 하이픈, 콜론으로 떨어져 있어야 한다(낱말 한가운데서 끊지 않게) */
export function englishLeadingRun(title: string): string | null {
  const m = title.match(/^([^가-힣]+?)[\s~〜～\-–—:：]+[가-힣]/);
  if (!m) return null;
  const run = m[1].replace(/[\s~〜～\-–—:：]+$/, "");
  // 한글 뒤에 영문이 다시 이어지면 앞 조각은 이름의 일부다("Naruto -나루토- 질풍전 ... Road To Boruto" 의 "Naruto")
  const rest = title.slice(m[0].length);
  if (/[A-Za-z]{3}/.test(rest)) return null;
  return usableSide(run) ? run : null;
}

/**
 * 지금 title_en 을 무엇으로 바꿀지. 바꿀 것이 없으면 null.
 * 이미 영문이면 손대지 않는다 — 이 함수는 한글이 잘못 들어앉은 칸만 고친다.
 */
export function pickEnglishTitle(current: string, fromTitleDb: string | null | undefined): string | null {
  if (!hasHangul(current)) return null;
  for (const candidate of [fromTitleDb, englishFromParens(current), englishFromSplit(current), englishLeadingRun(current)]) {
    const cleaned = cleanStoreTitle(candidate ?? null);
    if (isUsableEnglishTitle(cleaned)) return cleaned;
  }
  return null;
}
