// games 서비스 공개 진입점 — route(page)는 이 경로로만 접근한다(설계서 §5.1).
// 주의: unstable_cache 내부에서는 headers()/cookies()/auth() 를 호출하지 않는다.
//       로그인 의존 데이터는 페이지에서 별도로 조회한다.
export type * from "./dto";
export { bestScore, bestUserScore, cheapestPlatform, displayTitle, toPublicGameDto } from "./mappers";
export { getHomeData } from "./home";
export { getUpcomingGames, UPCOMING_LIMIT, UPCOMING_WINDOW_DAYS } from "./upcoming";
export type { UpcomingEntry, UpcomingMonth } from "./upcoming";
export { searchGames } from "./search";
export { GAMES_PAGE_SIZE, getGameFacets, listGames } from "./list";
export type { GameFacets, GameListFilter, GameListResult } from "./list";
export { getGameBySlug, getGameBySlugCached } from "./detail";
export { averageIntervalDays, getGamePatches, getGamePatchesCached, latestPatches } from "./patches";
export { getPricePerHourScale } from "./price-per-hour";
