// 목록 정렬용 집계 표(game_list_stats)를 통째로 다시 쓴다. 왜 그 표가 있는지는 db/schema-list-stats 머리 주석에 있다.
//
// 왜 바뀐 게임만 고치지 않고 통째로 쓰나: 인기 순번은 "며칠 안에 본 순번만" 세고, 최신 출시순은 "오늘까지 나온 날짜만" 센다.
// 둘 다 시간이 지나면 값이 바뀌는데 그 게임은 아무도 건드리지 않는다. 게임별로 고치면 그런 행이 영원히 낡는다.
// 통째로 써도 4만 행 남짓, 한 번에 1초 안쪽이다(2026-11-02 실측).
//
// 지우기와 붓기를 한 batch(한 트랜잭션)로 묶는다 — 사이에 들어온 목록 요청이 빈 표를 보면 목록이 0건이 된다.
import { sql } from "drizzle-orm";
import { getDb } from "@/server/db/client";
import { LIST_AGG_COLUMNS, listAggQuery } from "@/server/db/list-agg";
import { gameListStats } from "@/server/db/schema";
import type { AuditSource } from "@/server/db/audit";

export async function refreshListStats(actor: AuditSource): Promise<void> {
  const db = getDb();
  const cols = sql.raw([...LIST_AGG_COLUMNS, "created_source", "updated_source"].join(", "));
  const agg = listAggQuery([]).as("agg");
  await db.batch([
    db.delete(gameListStats),
    db.execute(sql`insert into ${gameListStats} (${cols}) select agg.*, ${actor}, ${actor} from ${agg}`),
  ]);
}
