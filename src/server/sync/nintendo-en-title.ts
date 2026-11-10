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
  if (hasHangul(outside) && isUsableEnglishTitle(inside)) return inside;
  if (hasHangul(inside) && isUsableEnglishTitle(outside)) return outside;
  return null;
}

/**
 * 지금 title_en 을 무엇으로 바꿀지. 바꿀 것이 없으면 null.
 * 이미 영문이면 손대지 않는다 — 이 함수는 한글이 잘못 들어앉은 칸만 고친다.
 */
export function pickEnglishTitle(current: string, fromTitleDb: string | null | undefined): string | null {
  if (!hasHangul(current)) return null;
  for (const candidate of [fromTitleDb, englishFromParens(current)]) {
    const cleaned = cleanStoreTitle(candidate ?? null);
    if (isUsableEnglishTitle(cleaned)) return cleaned;
  }
  return null;
}
