// 목록, 검색, 홈이 공유하는 SQL 조건 조각.
//
// DLC 를 games 행으로 담기로 한 이상(기획서 5.4), "본편만 보여준다"는 조건이 모든 목록 쿼리에 붙어야 한다.
// 그 조건을 각 파일에 흩어 놓으면 언젠가 한 곳이 빠지고, 그 화면에서만 DLC 가 본편처럼 섞여 나온다.
// 그래서 조건을 여기 한 곳에 두고 테스트를 붙인다.
import { and, eq, isNull, sql, type SQL } from "drizzle-orm";
import { gameCompanies, gamePlatforms, gameRequirementFloors, gameSourceRefs, gameSubscriptions, games, companies, subscriptions, type Platform } from "@/server/db/schema";
import { HIDDEN_PLATFORMS, HIDDEN_REGIONS } from "@/lib/platform";
import type { RigSpec } from "@/lib/hardware/rig";

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
 * 목록에 낼 수 있는 본편만. DLC, 에디션, 번들이 빠지고, 스토어와 못 이어진 게임도,
 * 매장이 자기 상품을 걸려고 만든 임시 게임도 빠진다.
 *
 * 세 조건을 한 함수에 접은 이유는 이 파일이 있는 이유와 같다 — 호출부(목록, 검색, 홈, 회사,
 * 출시예정)에 흩어 놓으면 언젠가 한 곳이 빠지고, 그 화면에서만 오염이 되살아난다.
 * **수집(sync)과 관리자 화면은 이걸 쓰지 않는다** — 거기서는 걸러지지 않은 사실을 봐야 한다.
 *
 * `visibility` 를 따로 보는 이유(매장 설계서 §7): 매장 발 게임은 ref 가 없어 `matchedToStore()`
 * 만으로도 지금은 걸린다. 하지만 역방향 수집(§5.3)이 스토어 ID 를 붙이는 순간 그 조건이 풀리고,
 * 아직 사람이 확인하지 않은 행이 전체 목록으로 샌다. 승격은 `visibility` 를 올리는 일이어야 한다.
 */
export function mainGamesOnly(): SQL {
  return and(eq(games.contentType, "game"), eq(games.visibility, "public"), matchedToStore())!;
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

/**
 * 이 기기로 돌아가는 게임 — 설계 문서 §7 의 3단계 필터.
 *
 * 접어 둔 문턱(game_requirement_floors)과 견주기만 한다. 규칙은 verdict.judge 와 같은 모양이다:
 *   - 아는 조건 중 하나라도 못 넘으면 뺀다
 *   - 아는 조건이 하나도 없으면 뺀다(판정 불가를 조용히 통과시키지 않는다 — 설계 §6)
 * 문턱이 아예 없는 게임(사양 미수집, 콘솔 전용)도 빠진다. "돌아간다" 고 말할 근거가 없기 때문이다.
 *
 * 최소 사양만 본다. 권장까지 요구하면 "돌아가는 게임" 이 아니라 "쾌적한 게임" 이 되는데,
 * 권장 사양은 절반 가까운 게임에 아예 없다(실측 2,572/3,498) — 없는 기준으로 게임을 지우게 된다.
 */
export function runsOnRig(rig: RigSpec): SQL {
  // 기기가 안 적은 부위는 견줄 수 없다. 기기 쪽이 null 이면 그 부위는 조건에 아예 넣지 않는다 —
  // "적지 않았다" 를 "못 넘는다" 로 읽으면 CPU 만 적은 사람에게 목록이 통째로 비어 보인다
  const slots: Array<{ column: SQL; mine: number }> = [];
  if (rig.cpuTier !== null) slots.push({ column: sql`${gameRequirementFloors.minCpuTier}`, mine: rig.cpuTier });
  if (rig.gpuTier !== null) slots.push({ column: sql`${gameRequirementFloors.minGpuTier}`, mine: rig.gpuTier });
  if (rig.ramMb !== null) slots.push({ column: sql`${gameRequirementFloors.minRamMb}`, mine: rig.ramMb });

  // 문턱이 null 인 부위는 그 게임에서 판정할 수 없는 자리다. 못 넘은 것으로 세지 않고 넘어간다
  const meets = slots.map((s) => sql`(${s.column} is null or ${s.column} <= ${s.mine})`);
  // 다만 넘어간 자리만 남으면 판정을 한 것이 아니다 — 한 부위라도 실제로 견줬어야 한다
  const judged = slots.map((s) => sql`${s.column} is not null`);

  return sql`exists (
    select 1 from ${gameRequirementFloors}
    where ${gameRequirementFloors.gameId} = ${games.id}
      and ${gameRequirementFloors.osFamily} = ${rig.osFamily}
      and ${sql.join(meets, sql` and `)}
      and (${sql.join(judged, sql` or `)})
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
 * 검색어가 있는 질의는 집계를 left join 으로 붙이는데(한국 행이 없는 게임도 받으려고),
 * 그러면 플랫폼 필터를 강제하던 힘이 같이 풀린다 — 그 자리를 이 조건이 대신 받는다.
 *
 * **숨긴 지역도 본다**(2026-09-22). 전에는 일부러 지역을 안 봤다: 한국 행이 없는 게임
 * (실측 477건, 전부 일본 스위치)을 검색으로는 찾게 하려던 자리였다. 그런데 일본을 통째로 내리면서
 * (lib/platform 의 HIDDEN_REGIONS) 그 게임들은 "한국에서 못 사는 게임" 이 됐고, 검색으로도
 * 보여 줄 이유가 없어졌다. 숨긴 지역 행밖에 없는 게임은 이 조건에서 떨어진다.
 */
export function hasVisiblePlatform(platforms: Platform[]): SQL {
  // 목록을 그대로 두고 조각만 붙이는 자리라 exists 안에서 조건을 이어 붙인다.
  // 배열은 자리표시자 하나로 묶이지 않는다 — sql.join 으로 값마다 자리표시자를 만든다
  const values = (vals: readonly string[]): SQL => sql.join(vals.map((v) => sql`${v}`), sql`, `);
  const notHidden = HIDDEN_PLATFORMS.length > 0 ? sql` and ${gamePlatforms.platform} not in (${values(HIDDEN_PLATFORMS)})` : sql``;
  const notHiddenRegion = HIDDEN_REGIONS.length > 0 ? sql` and ${gamePlatforms.region} not in (${values(HIDDEN_REGIONS)})` : sql``;
  const onlyPicked = platforms.length > 0 ? sql` and ${gamePlatforms.platform} in (${values(platforms)})` : sql``;
  return sql`exists (
    select 1 from ${gamePlatforms}
    where ${gamePlatforms.gameId} = ${games.id}${notHidden}${notHiddenRegion}${onlyPicked}
  )`;
}
