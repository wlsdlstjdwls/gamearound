// /games 주소를 GamesQuery 로 읽는 한 곳 — 서버 페이지와 필터의 "먼저 보여 주기"(game-filters/optimistic)가 같이 쓴다.
//
// 두 벌이면 안 되는 이유: 필터를 누른 순간 클라이언트가 그 주소를 읽어 화면을 먼저 바꾸고, 잠시 뒤 서버가
// 같은 주소를 읽은 값으로 덮는다. 둘의 읽기가 다르면 칩이 한 번 바뀌었다가 다시 바뀌어 보인다.
//
// 낱개 스토어 값은 고르는 자리가 없어졌지만(game-filters/groups) 여기서는 계속 받는다 —
// 밖에서 들어온 주소(`platform=steam`)와 회사, 상세 화면의 링크가 그 값을 쓴다.
import { joinPlatformValues, parseGamesQuery, parsePlatformValues, type GamesQuery } from "@/lib/games-query";
import { isPlatformValue, PLATFORM_VALUE_ORDER } from "@/lib/platform";

type Search = Record<string, string | string[] | undefined>;

export function readGamesQuery(sp: Search): GamesQuery {
  const q = parseGamesQuery(sp);
  const picked = parsePlatformValues(q.platform).filter(isPlatformValue);
  return { ...q, platform: joinPlatformValues(picked, PLATFORM_VALUE_ORDER) };
}

/** gamesHref 가 만든 주소("/games?platform=pc&ko=1")를 다시 GamesQuery 로. 같은 키가 여럿이면 앞의 것 */
export function queryFromHref(href: string): GamesQuery {
  const qs = href.includes("?") ? href.slice(href.indexOf("?") + 1) : "";
  const sp: Search = {};
  for (const [k, v] of new URLSearchParams(qs)) if (!(k in sp)) sp[k] = v;
  return readGamesQuery(sp);
}
