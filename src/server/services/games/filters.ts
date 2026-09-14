// 목록, 검색, 홈이 공유하는 SQL 조건 조각.
//
// DLC 를 games 행으로 담기로 한 이상(기획서 5.4), "본편만 보여준다"는 조건이 모든 목록 쿼리에 붙어야 한다.
// 그 조건을 각 파일에 흩어 놓으면 언젠가 한 곳이 빠지고, 그 화면에서만 DLC 가 본편처럼 섞여 나온다.
// 그래서 조건을 여기 한 곳에 두고 테스트를 붙인다.
import { and, eq, isNull, sql, type SQL } from "drizzle-orm";
import { gameCompanies, gamePlatforms, gameSubscriptions, games, companies, subscriptions } from "@/server/db/schema";

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
