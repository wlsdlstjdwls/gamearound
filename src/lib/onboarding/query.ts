// 받은 취향을 목록 질의로 옮기는 자리 — 순수 함수다. DB, 네트워크를 모른다.
//
// 이 함수가 온보딩의 **값이 실제로 쓰이는 첫 자리**다(설계 §9 의 4회차). 결과 화면이 "지금 조건에
// 맞는 게임 N개" 를 세는 데 쓰고, 그 화면의 "내 조건으로 보기" 가 같은 값으로 주소를 만든다.
// 세는 질의와 링크가 같은 함수를 봐야 "N개라더니 목록은 다르다" 가 생기지 않는다.
import { PLATFORM_VALUE_SEP, parsePlatformValues, type GamesQuery } from "@/lib/games-query";
import type { Platform } from "@/server/db/schema";

/**
 * 사람이 목록 조건을 직접 걸었는가. 정렬과 쪽 번호는 조건이 아니다 — 정렬만 바꾼 주소에도 취향은 걸린다.
 * all(개인화 끔)도 여기서 참으로 친다: 그 주소는 "취향 없이 보겠다" 를 이미 말했다.
 */
export function hasExplicitListFilter(q: GamesQuery): boolean {
  return Boolean(
    q.all ||
      q.q ||
      q.platform ||
      q.genre ||
      q.onSale ||
      q.event ||
      q.minDiscount !== undefined ||
      q.maxPrice !== undefined ||
      q.company ||
      q.subscription ||
      q.hideFree ||
      q.korean ||
      q.rig,
  );
}

/** 취향에서 목록 질의로. 고른 것이 없으면 그 칸은 비운다(거르지 않는다) */
export function personalQuery(input: { platforms?: readonly Platform[] | null; genreNames?: readonly string[] | null }): GamesQuery {
  const platform = input.platforms?.length ? [...input.platforms].join(PLATFORM_VALUE_SEP) : undefined;
  /*
   * 장르는 **한 개만** 싣는다. 목록의 genre 칸이 값 하나만 받기 때문이다(games-query 의 GamesQuery).
   * 여러 장르를 "또는" 으로 묶는 일은 목록 질의를 고쳐야 하는 별개의 일이라 여기서 지어내지 않는다 —
   * 첫 번째를 쓰는 이유는 카드 순서가 곧 우리가 정한 대표성 순서이기 때문이다(constants 의 GENRE_CHOICE_NAMES).
   */
  const genre = input.genreNames?.length ? input.genreNames[0] : undefined;
  return { platform, genre };
}

/**
 * 취향이 지금 목록에 걸려 있는가 — 필터 맨 위 "내 취향" 토글이 켜져 보일지(game-filters/personal-toggle).
 *
 * 두 경우다. 사람이 아무 조건도 안 걸고 왔으면(all 도 없으면) 서버가 취향을 얹는다.
 * 취향이 걸린 채로 다른 칩을 눌렀으면 주소에 all=1 과 취향 값이 그대로 실려 온다 — 이때도 켜진 것이다.
 * 예전에는 두 번째 경우를 "사람이 직접 건 조건" 으로만 봐서 토글이 통째로 사라졌다(2026-10-12 사용자 신고).
 * 취향 값 중 하나라도 사람이 바꿨으면(플랫폼을 콘솔로 바꾸는 등) 더는 취향으로 거르는 중이 아니다.
 */
export function isPresetApplied(q: GamesQuery, preset: GamesQuery): boolean {
  if (!hasExplicitListFilter({ ...q, all: false })) return !q.all;
  return samePlatformValues(q.platform, preset.platform) && (preset.genre === undefined || q.genre === preset.genre);
}

/**
 * 플랫폼 값은 **모음으로** 견준다. 취향은 고른 순서대로("epic,steam") 실리고 주소는 정해진 순서로
 * 다시 세워져("steam,epic") 돌아온다 — 글자로 견주면 같은 선택이 다르다고 나와 토글이 꺼졌다(2026-10-12 사용자 신고).
 */
function samePlatformValues(current: string | undefined, preset: string | undefined): boolean {
  if (preset === undefined) return true;
  const a = new Set(parsePlatformValues(current));
  const b = new Set(parsePlatformValues(preset));
  return a.size === b.size && [...b].every((v) => a.has(v));
}
