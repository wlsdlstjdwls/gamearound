// 목록, 검색, 홈이 공유하는 SQL 조건 조각.
//
// DLC 를 games 행으로 담기로 한 이상(기획서 5.4), "본편만 보여준다"는 조건이 모든 목록 쿼리에 붙어야 한다.
// 그 조건을 각 파일에 흩어 놓으면 언젠가 한 곳이 빠지고, 그 화면에서만 DLC 가 본편처럼 섞여 나온다.
// 그래서 조건을 여기 한 곳에 두고 테스트를 붙인다.
import { and, eq, isNull, sql, type SQL } from "drizzle-orm";
import { gameCompanies, gamePlatforms, gameSourceRefs, gameSubscriptions, games, companies, subscriptions, type Platform } from "@/server/db/schema";
import { HIDDEN_PLATFORMS } from "@/lib/platform";

/**
 * 스토어와 이어져 있는 게임. 매칭(auto, manual)이 하나라도 있어야 한다.
 *
 * 2026-09-15 psprices 병합분 2,173건이 **쓸 수 있는 ref 없이** 본편으로 앉아 있다.
 * 실측(2026-09-18): ref 없는 본편은 **전부** psprices 행을 갖는다(2,173/2,173). 반대로 정상 경로로
 * 들어온 게임은 스토어에서 발견될 때 ref 가 먼저 생기므로 이 조건에 걸리지 않는다 —
 * 한국에 없는 일본 전용 게임 516건도 nintendo_jp ref 를 갖고 있어 겹침이 0이다.
 *
 * 왜 지우지 않고 거르나: 그 2,173건의 절반 넘게가 진짜 게임이다(표본 50 중 30). 이름이 평범해서
 * 규칙으로 못 가릴 뿐이다("Goblin Sword" 에는 걸 낱말이 없다). 지우면 커버 2,118장과 가격 2,547행이
 * 함께 날아가고 되돌리려면 psprices 부터 다시 긁어야 한다.
 *
 * **스스로 풀린다는 것이 이 방식의 값이다** — 크론이 매칭에 성공하는 순간 ref 가 생기고
 * 그 게임은 손대지 않아도 목록으로 돌아온다. 사람이 두 번째 손질을 하러 올 필요가 없다.
 */
function matchedToStore(): SQL {
  return sql`exists (
    select 1 from ${gameSourceRefs}
    where ${gameSourceRefs.gameId} = ${games.id} and ${gameSourceRefs.matchedBy} in ('auto', 'manual')
  )`;
}

/**
 * 목록에 낼 수 있는 본편만. DLC, 에디션, 번들이 빠지고, 스토어와 못 이어진 게임도 빠진다.
 *
 * 두 조건을 한 함수에 접은 이유는 이 파일이 있는 이유와 같다 — 호출부(목록, 검색, 홈, 회사,
 * 출시예정)에 흩어 놓으면 언젠가 한 곳이 빠지고, 그 화면에서만 오염이 되살아난다.
 * **수집(sync)과 관리자 화면은 이걸 쓰지 않는다** — 거기서는 걸러지지 않은 사실을 봐야 한다.
 */
export function mainGamesOnly(): SQL {
  return and(eq(games.contentType, "game"), matchedToStore())!;
}

/** 특정 회사의 게임만(개발, 배급 무관). 회사 화면과 목록 필터가 같은 조건을 쓴다 */
export function byCompanySlug(slug: string): SQL {
  return sql`exists (
    select 1 from ${gameCompanies}
    inner join ${companies} on ${companies.id} = ${gameCompanies.companyId}
    where ${gameCompanies.gameId} = ${games.id} and ${companies.slug} = ${slug}
  )`;
}

/**
 * 지금 구독으로 플레이할 수 있는 게임만.
 * removed_at is null 이 핵심이다 — 빠진 이력 행까지 세면 "예전에 있었던" 게임이 포함된다.
 */
export function inSubscription(key: string): SQL {
  return sql`exists (
    select 1 from ${gameSubscriptions}
    inner join ${gamePlatforms} on ${gamePlatforms.id} = ${gameSubscriptions.gamePlatformId}
    inner join ${subscriptions} on ${subscriptions.id} = ${gameSubscriptions.subscriptionId}
    where ${gamePlatforms.gameId} = ${games.id}
      and ${subscriptions.key} = ${key}
      and ${gameSubscriptions.removedAt} is null
  )`;
}

/** 어느 구독이든 하나라도 포함된 게임 — "구독으로 즐길 수 있어요" 칩 하나로 거를 때 */
export function inAnySubscription(): SQL {
  return sql`exists (
    select 1 from ${gameSubscriptions}
    inner join ${gamePlatforms} on ${gamePlatforms.id} = ${gameSubscriptions.gamePlatformId}
    where ${gamePlatforms.gameId} = ${games.id} and ${gameSubscriptions.removedAt} is null
  )`;
}

/** undefined 를 걸러 내고 남은 조건만 AND 로 묶는다. 전부 비면 undefined(= 조건 없음) */
export function allOf(...conds: Array<SQL | undefined>): SQL | undefined {
  const list = conds.filter((c): c is SQL => c !== undefined);
  return list.length === 0 ? undefined : and(...list);
}

/** 본편 판정에 쓰는 조건(테스트용으로도 노출) — 부모가 없는 행이 본편이라는 불변식 */
export function isOrphanMainGame(): SQL {
  return and(eq(games.contentType, "game"), isNull(games.parentGameId))!;
}

/**
 * 보이는 스토어 행을 하나라도 가진 게임. 플랫폼 값을 주면 그중 하나여야 한다.
 *
 * **지역을 보지 않는 것이 이 조건의 전부다.** 목록의 기본 집계(platformAgg)는 한국 행만 세고
 * inner join 으로 붙어서, 한국에 없는 게임(2026-09-18 실측 477건, 전부 일본 스위치)은
 * 플랫폼 필터를 걸든 말든 목록에서 통째로 사라진다. 검색어가 있는 질의는 그 게임도 보여야 해서
 * 집계를 left join 으로 바꾸는데, 그러면 플랫폼 필터를 강제하던 힘까지 같이 풀린다 —
 * 그 자리를 이 조건이 대신 받는다.
 */
export function hasVisiblePlatform(platforms: Platform[]): SQL {
  // 목록을 그대로 두고 조각만 붙이는 자리라 exists 안에서 조건을 이어 붙인다.
  // 배열은 자리표시자 하나로 묶이지 않는다 — sql.join 으로 값마다 자리표시자를 만든다
  const values = (vals: readonly string[]): SQL => sql.join(vals.map((v) => sql`${v}`), sql`, `);
  const notHidden = HIDDEN_PLATFORMS.length > 0 ? sql` and ${gamePlatforms.platform} not in (${values(HIDDEN_PLATFORMS)})` : sql``;
  const onlyPicked = platforms.length > 0 ? sql` and ${gamePlatforms.platform} in (${values(platforms)})` : sql``;
  return sql`exists (
    select 1 from ${gamePlatforms}
    where ${gamePlatforms.gameId} = ${games.id}${notHidden}${onlyPicked}
  )`;
}
