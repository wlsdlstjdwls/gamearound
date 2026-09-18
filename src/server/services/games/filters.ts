// 목록, 검색, 홈이 공유하는 SQL 조건 조각.
//
// DLC 를 games 행으로 담기로 한 이상(기획서 5.4), "본편만 보여준다"는 조건이 모든 목록 쿼리에 붙어야 한다.
// 그 조건을 각 파일에 흩어 놓으면 언젠가 한 곳이 빠지고, 그 화면에서만 DLC 가 본편처럼 섞여 나온다.
// 그래서 조건을 여기 한 곳에 두고 테스트를 붙인다.
import { and, eq, isNull, sql, type SQL } from "drizzle-orm";
import { gameCompanies, gamePlatforms, gameSubscriptions, games, companies, subscriptions, type Platform } from "@/server/db/schema";
import { HIDDEN_PLATFORMS } from "@/lib/platform";

/** 본편만. DLC, 에디션, 번들은 목록에서 빠진다 */
export function mainGamesOnly(): SQL {
  return eq(games.contentType, "game");
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
