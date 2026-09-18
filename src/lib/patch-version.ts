// 패치 제목에서 버전 문자열을 읽어내는 순수 함수.
// 스토어가 버전을 따로 주지 않아(steam 공지는 제목만 준다) 제목이 유일한 근거다.
// 여러 어댑터가 같은 규칙을 써야 해서 어댑터가 아니라 lib 에 둔다 — 스토어마다 다르게 읽으면
// 같은 게임이라도 스토어마다 다른 버전 체계로 보인다.

/**
 * 점으로 이어진 숫자 묶음. 앞뒤가 글자, 점이면 잡지 않는다.
 * "v" 접두사는 붙어 있어도 되고 없어도 된다("v4.1.1.3622274", "Patch 2.31").
 */
const VERSION = /(?:^|[^\w.])v?(\d+(?:\.\d+)+)(?![\w.])/i;

/** 연도로 보이는 첫 자리. "2025.12.16" 같은 날짜를 버전으로 오독하지 않기 위한 방어다 */
const YEAR_MIN = 1990;
const YEAR_MAX = 2100;

/**
 * "ELDEN RING - Patch Notes Version 1.16.1" → "1.16.1".
 * 버전이 없거나(예: "Counter-Strike 2 Update") 날짜로 보이면 null.
 *
 * 한 자리 숫자(예: "Update 3")는 일부러 잡지 않는다 — 회차 번호, 시즌 번호, 개수와 구별이 안 돼서
 * 잡으면 버전이 아닌 값이 버전 자리에 박힌다. 점이 하나라도 있어야 버전으로 본다.
 */
export function patchVersionFromTitle(title: string): string | null {
  const m = title.match(VERSION);
  if (!m) return null;
  const version = m[1];
  const head = Number(version.split(".")[0]);
  if (head >= YEAR_MIN && head <= YEAR_MAX) return null;
  return version;
}
