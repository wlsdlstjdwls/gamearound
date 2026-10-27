// 카탈로그 게임 장르(한국어 이름)를 인디 장르 키로 — 게임 상세의 인디 추천 한 칸이 "같은 장르" 를 고를 때 쓴다(services/promotions/indie-spots).
// 인디 장르 이름이 카탈로그 어휘(lib/genres)와 같은 낱말을 쓰기로 해 이름끼리 맞춘다. 카탈로그에 없는 이름(플랫포머, 카드)은 그냥 안 맞는다.
import { INDIE_GENRES, type IndieGenre } from "@/lib/indie/constants";
import { INDIE_GENRE_LABEL } from "@/lib/indie/messages";

/** 비교에서 뺀 키 — "기타" 끼리 같다고 같은 장르는 아니다 */
const NON_MATCHING_GENRE: IndieGenre = "other";

export function indieGenresOf(gameGenres: readonly string[]): IndieGenre[] {
  return INDIE_GENRES.filter((g) => g !== NON_MATCHING_GENRE && gameGenres.includes(INDIE_GENRE_LABEL[g]));
}
