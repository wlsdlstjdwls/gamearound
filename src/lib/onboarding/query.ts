// 받은 취향을 목록 질의로 옮기는 자리 — 순수 함수다. DB, 네트워크를 모른다.
//
// 이 함수가 온보딩의 **값이 실제로 쓰이는 첫 자리**다(설계 §9 의 4회차). 결과 화면이 "지금 조건에
// 맞는 게임 N개" 를 세는 데 쓰고, 그 화면의 "내 조건으로 보기" 가 같은 값으로 주소를 만든다.
// 세는 질의와 링크가 같은 함수를 봐야 "N개라더니 목록은 다르다" 가 생기지 않는다.
import { PLATFORM_VALUE_SEP, type GamesQuery } from "@/lib/games-query";
import type { Platform } from "@/server/db/schema";

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
