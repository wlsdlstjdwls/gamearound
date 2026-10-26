// 검색 자동완성 상수와 순수 도우미. 서버(services/games/suggest)와 클라이언트(search-box)가 같이 읽는다.
import { gamesHref } from "@/lib/games-query";

/** 두 글자부터 묻는다. 한 글자(특히 한글 한 음절)는 카탈로그 대부분에 걸려 후보가 아무 말도 안 한다 */
export const SUGGEST_MIN_CHARS = 2;
/** 입력을 멈추고 이만큼 기다렸다 묻는다. 자판 한 타 간격(약 120~200ms)보다 길어야 타자마다 요청이 나가지 않는다 */
export const SUGGEST_DEBOUNCE_MS = 220;
/** 갈래별 최대 개수. 머리띠 아래 펼친 목록이 화면 절반을 넘지 않게 합이 10 안쪽이다 */
export const SUGGEST_LIMITS = { games: 6, genres: 3, companies: 3 } as const;

export const SUGGEST_MESSAGES = {
  games: "게임",
  genres: "장르",
  companies: "개발사",
  empty: "검색 결과가 없어요",
  seeAll: (q: string) => `"${q}" 전체 결과 보기`,
  genreCount: (n: number) => `${n.toLocaleString("ko-KR")}개`,
  listLabel: "검색어 추천",
} as const;

/** 장르, 개발사를 고르면 그 조건이 걸린 전체 게임 목록으로 간다(상세가 있는 건 게임뿐이다) */
export function genreHref(name: string): string {
  return gamesHref({}, { genre: name });
}

export function companyHref(slug: string): string {
  return gamesHref({}, { company: slug });
}
