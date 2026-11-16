// 성능 표지(4K, 60/120fps, HDR, 레이 트레이싱 등)를 채운다 — Xbox 카탈로그 속성, Steam 은 PCGamingWiki(sync/perf-features).
//
//   pnpm perf:collect                 회차 몫(Xbox 400, PCGamingWiki 60)
//   pnpm perf:collect -- 4000 600     몫을 늘려 한꺼번에(처음 채울 때)
//
// 물어본 지 30일이 지난 행만 다시 묻는다. 정기 실행은 crawl-meta 워크플로가 맡는다.
import path from "node:path";
import { config as loadEnv } from "dotenv";
loadEnv({ path: path.resolve(process.cwd(), ".env.local"), quiet: true });

import { collectPerfFeatures } from "@/server/sync/perf-features";

async function main(): Promise<void> {
  const [xbox, pcgw] = process.argv.slice(2).filter((a) => a !== "--").map(Number);
  const t0 = Date.now();
  const r = await collectPerfFeatures({ xboxLimit: xbox || undefined, pcgwLimit: pcgw || undefined });
  console.log(`[perf:collect] xbox ${r.xbox}, steam ${r.steam}, 실패 ${r.failed} (${Math.round((Date.now() - t0) / 1000)}초)`);
}

void main();
