// 게임 노출 체크리스트 — 카드 한 장을 화면에 세워도 되는지 묻는 조건을 한곳에 둔다.
//
// 2026-10-02 사용자: "사진이 있는지, 정보가 있는지, 한글제목으로 되는지 체크리스트를 해서 노출".
// 실측(본편 18,499건)을 보고 항목마다 **어디까지 강제할지**를 갈랐다. 전부를 모든 화면에 걸면
// 카탈로그가 통째로 빈다 — 한글 제목 하나만 걸어도 84%(15,569건)가 사라진다.
//
// | 항목                 | 빠지는 수        | 어디에 거나                                   |
// |----------------------|------------------|-----------------------------------------------|
// | 커버 있음            | 201 (1.1%)       | 모든 화면(mainGamesOnly) — 회색 칸은 깨진 화면으로 읽힌다 |
// | 한국 가격 있음       | 2,326            | 진열 줄 — 목록은 가격 없는 출시예정작도 보여야 한다 |
// | 알려진 게임 신호     | 최근 30일 출시 1,639 중 약 1,000 | 진열 줄 — "Wizard Harder Or Get Laid Off" 류를 거른다 |
// | 한글 제목            | 15,569 (84%)     | 강제 안 함. 신호 중 하나로만 센다              |
//
// 한글 제목을 문턱으로 못 쓰는 이유: Cyberpunk 2077, HELLDIVERS 2 처럼 한국 스토어에서도 영문 그대로인
// 게임이 많다. 그 대신 "한국어 이름을 따로 받은 게임" 은 한국 시장을 보고 낸 게임이라 신호로 친다.
//
// "진열 줄" 은 사람이 고르지 않고 우리가 골라 세우는 자리다 — 홈의 할인, 곧 할인 마감, 최근 출시,
// 개인화 줄. 거기 선 카드는 우리가 추천하는 것으로 읽힌다. 목록과 검색은 찾는 자리라 신호를 요구하지 않는다.
import { and, isNotNull, ne, sql, type SQL } from "drizzle-orm";
import { gamePlatforms, games, HOME_REGION } from "@/server/db/schema";
import { SHOWCASE_MIN_HLTB_LOGGED, SHOWCASE_MIN_REVIEWS } from "@/lib/games/exposure";

/** 1. 커버 있음 — 모든 노출 자리의 바닥 조건. 빈 문자열도 없는 것으로 친다 */
export function hasCover(): SQL {
  return and(isNotNull(games.coverUrl), ne(games.coverUrl, ""))!;
}

/** 2. 한국 스토어 가격이 있다 — 무료(0)는 값이 있는 것이다. 값을 못 읽은 행(null)만 빠진다 */
function hasHomePrice(): SQL {
  return sql`exists (
    select 1 from ${gamePlatforms}
    where ${gamePlatforms.gameId} = ${games.id} and ${gamePlatforms.region} = ${HOME_REGION} and ${gamePlatforms.currentPrice} is not null
  )`;
}

/**
 * 3. 알려진 게임 — 넷 중 하나라도 있으면 된다.
 *    스토어 순번(낡은 것도 친다, 한때라도 순위에 있었다), 평가 수, HLTB 기록, 한국어 이름.
 * 순번의 신선도를 안 보는 이유: 여기서 묻는 건 "지금 인기냐" 가 아니라 "아는 사람이 있는 게임이냐" 다.
 */
function isKnownGame(): SQL {
  return sql`(
    ${games.titleKo} is not null
    or coalesce(${games.hltbLoggedCount}, 0) >= ${SHOWCASE_MIN_HLTB_LOGGED}::int
    or exists (
      select 1 from ${gamePlatforms}
      where ${gamePlatforms.gameId} = ${games.id}
        and (${gamePlatforms.popularityRank} is not null or coalesce(${gamePlatforms.userScoreCount}, 0) >= ${SHOWCASE_MIN_REVIEWS}::int)
    )
  )`;
}

/** 진열 줄 조건 — mainGamesOnly() 위에 얹는다(커버는 거기서 이미 걸린다) */
export function showcaseReady(): SQL {
  return and(hasHomePrice(), isKnownGame())!;
}
