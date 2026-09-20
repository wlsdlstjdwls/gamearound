// 인기순위 순번만 새로 읽는다 — 발견도 가격도 건드리지 않는다.
//   tsx scripts/sync-ranks.ts [--source=steam]
//
// 왜 따로 도는 입구가 필요한가: 순번 수집은 run-store 의 0단계로 붙어 있지만 그 단계는
// **발견을 도는 실행에서만** 돈다(Actions 가격 갱신에 30초를 얹지 않으려고). 스팀 발견은 로컬에서만
// 도므로, 발견을 한동안 안 돌리면 순번이 POPULARITY_RANK_MAX_AGE_DAYS 를 넘겨 화면에서 사라진다.
// 이 스크립트가 그 사이를 메운다 — 20페이지, 약 30초.
import path from "node:path";
import { config as loadEnv } from "dotenv";
loadEnv({ path: path.resolve(process.cwd(), ".env.local"), quiet: true });
loadEnv({ quiet: true });

import { getStoreAdapter, isSource, isStoreSource } from "@/server/adapters";
import { createContext } from "@/server/sync/context";
import { syncPopularityRanks } from "@/server/sync/rank-writer";

async function main(): Promise<number> {
  const arg = process.argv.slice(2).find((a) => a.startsWith("--source="));
  const source = arg ? arg.slice("--source=".length) : "steam";
  if (!isSource(source) || !isStoreSource(source)) {
    console.error(`--source 가 스토어 소스가 아닙니다: ${source}`);
    return 1;
  }
  const adapter = getStoreAdapter(source);
  if (!adapter.listPopularPages) {
    console.log(`[ranks] ${source} 는 인기순위 목록을 주지 않습니다 — 건너뜁니다`);
    return 0;
  }
  const started = Date.now();
  const ctx = await createContext(source);
  const written = await syncPopularityRanks(ctx, source, adapter);
  console.log(`[ranks] ${source}: ${written}건 기록 (${((Date.now() - started) / 1000).toFixed(1)}s)`);
  return written > 0 ? 0 : 1;
}

main().then((c) => process.exit(c)).catch((e) => {
  console.error(`[ranks] 예외: ${e instanceof Error ? (e.stack ?? e.message) : String(e)}`);
  process.exit(1);
});
