// 목록 정렬용 집계 표(game_list_stats)를 다시 쓴다. 왜 그 표가 있는지는 db/schema-list-stats 머리 주석에 있다.
//
// 두 갈래로 쓴다(2026-11-02).
//   refreshListStatsFor  수집 회차 끝. 이번 회차가 값을 바꾼 게임과 순번을 새로 쓴 게임만 지우고 다시 붓는다.
//   refreshListStats     하루 크론(/api/cron/daily). 표 전체를 다시 쓴다.
//
// 왜 회차마다 통째로 쓰지 않나: 예전에는 그랬다. 옛 DB 를 합쳐 표가 3만 8천 행이 되자, 값이 바뀐 회차(하루 약 60번)마다
// 3만 8천 행을 지우고 넣어 하루 230만 행을 쓰고 있었다. 회차 하나가 실제로 바꾸는 게임은 수백 건이다.
//
// 그런데도 하루 한 번은 통째로 쓰는 이유: 인기 순번은 "며칠 안에 본 순번만" 세고, 최신 출시순은 "오늘까지 나온 날짜만" 센다.
// 둘 다 시간이 지나면 값이 바뀌는데 그 게임은 아무도 건드리지 않는다. 게임별로만 고치면 그런 행이 영원히 낡는다.
// 하루 늦게 반영돼도 되는 값이라(순위에서 빠진 지 며칠, 출시일이 오늘이 된 것) 하루 한 번이면 충분하다.
//
// 지우기와 붓기를 한 batch(한 트랜잭션)로 묶는다 — 사이에 들어온 목록 요청이 빈 행을 보면 그 게임이 목록에서 빠진다.
import { inArray, or, sql, type SQL } from "drizzle-orm";
import type { PgColumn } from "drizzle-orm/pg-core";
import { getDb } from "@/server/db/client";
import { LIST_AGG_COLUMNS, listAggQuery } from "@/server/db/list-agg";
import { gameListStats, gamePlatforms, games } from "@/server/db/schema";
import type { AuditSource } from "@/server/db/audit";

const insertColumns = () => sql.raw([...LIST_AGG_COLUMNS, "created_source", "updated_source"].join(", "));

/** 표 전체를 다시 쓴다. 하루 크론과 손 스크립트(pnpm stats:list)가 부른다 */
export async function refreshListStats(actor: AuditSource): Promise<void> {
  const db = getDb();
  const agg = listAggQuery([]).as("agg");
  await db.batch([
    db.delete(gameListStats),
    db.execute(sql`insert into ${gameListStats} (${insertColumns()}) select agg.*, ${actor}, ${actor} from ${agg}`),
  ]);
}

/** 게임 id 열이 "이 슬러그들 또는 이 id 들" 에 드는가. 슬러그는 서브질의로 풀어 왕복을 늘리지 않는다 */
function gameIn(column: PgColumn, target: { slugs: string[]; gameIds: string[] }): SQL | undefined {
  const db = getDb();
  return or(
    target.gameIds.length > 0 ? inArray(column, target.gameIds) : undefined,
    target.slugs.length > 0 ? inArray(column, db.select({ id: games.id }).from(games).where(inArray(games.slug, target.slugs))) : undefined,
  );
}

/**
 * 고른 게임만 다시 쓴다. 집계에서 빠진 게임(한국 행이 사라진 것)은 지우기만 되고 다시 안 들어간다 — 통째로 쓸 때와 같은 결과다.
 * 둘 다 비면 아무것도 안 한다.
 */
export async function refreshListStatsFor(actor: AuditSource, target: { slugs: string[]; gameIds: string[] }): Promise<void> {
  if (target.slugs.length === 0 && target.gameIds.length === 0) return;
  const db = getDb();
  const agg = listAggQuery([], gameIn(gamePlatforms.gameId, target)).as("agg");
  await db.batch([
    db.delete(gameListStats).where(gameIn(gameListStats.gameId, target)),
    db.execute(sql`insert into ${gameListStats} (${insertColumns()}) select agg.*, ${actor}, ${actor} from ${agg}`),
  ]);
}
