// 목록 정렬용 집계(game_list_stats)를 손으로 다시 쓴다.
//
//   pnpm stats:list
//
// 평소에는 수집 실행이 끝날 때 sync/list-stats 가 쓴다. 이 스크립트는 표를 처음 만든 직후,
// 관리자가 가격을 손으로 고친 뒤처럼 수집을 기다리지 않고 목록 순서를 맞춰야 할 때 쓴다.
import path from "node:path";
import { config as loadEnv } from "dotenv";
loadEnv({ path: path.resolve(process.cwd(), ".env.local"), quiet: true });

import { sql } from "drizzle-orm";
import { getDb } from "@/server/db/client";
import { refreshListStats } from "@/server/sync/list-stats";

async function main(): Promise<void> {
  const t0 = Date.now();
  await refreshListStats("system");
  const [{ n }] = (await getDb().execute(sql`select count(*)::int as n from game_list_stats`)).rows as Array<{ n: number }>;
  console.log(`[stats:list] ${n}행 (${Date.now() - t0}ms)`);
}

void main();
