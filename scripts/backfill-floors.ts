// 사양 문턱 1회 접기 — pnpm floors:backfill [--limit=N]
//
// 왜 스크립트가 따로 있나: 접기는 수집 경로(sync/requirements)와 재매칭에 이미 붙어 있다.
// 다만 그 둘은 **이번에 건드린 게임**만 접으므로, 표를 처음 만든 날 한 번은 카탈로그 전체를 돌아야 한다.
// 그 뒤로는 부를 일이 없다 — 사양이 바뀌면 수집이, 사전이 바뀌면 재매칭이 각자 접는다.
//
// 스토어에 묻지 않는다. DB 안에서만 도는 일이라 중간에 끊어도 손해가 없다(다시 돌리면 같은 답이다).
import path from "node:path";
import { config as loadEnv } from "dotenv";
import { getDb } from "@/server/db/client";
import { gameRequirements } from "@/server/db/schema";
import { createContext } from "@/server/sync/context";
import { refreshFloors } from "@/server/sync/requirement-floors";
import { errorMessage } from "@/lib/errors";

loadEnv({ path: path.resolve(process.cwd(), ".env.local"), quiet: true });
loadEnv({ quiet: true });

/** 한 묶음에서 접을 게임 수. 게임당 사양 행이 2.4개라(실측) 한 번에 읽는 행은 이 값의 갑절쯤이다 */
const CHUNK = 300;

function parseArg(argv: string[], name: string): string | undefined {
  return argv.find((a) => a.startsWith(`--${name}=`))?.split("=")[1];
}

async function main(): Promise<number> {
  const limit = Number(parseArg(process.argv.slice(2), "limit") ?? 0) || Number.MAX_SAFE_INTEGER;
  const db = getDb();
  const rows = await db.selectDistinct({ gameId: gameRequirements.gameId }).from(gameRequirements);
  const targets = rows.slice(0, limit).map((r) => r.gameId);
  console.log(`[floors] 사양이 있는 게임 ${rows.length}건 중 ${targets.length}건을 접습니다`);
  if (targets.length === 0) return 0;

  const ctx = await createContext("steam");
  const started = Date.now();
  let folded = 0;
  for (let i = 0; i < targets.length; i += CHUNK) {
    folded += await refreshFloors(ctx, targets.slice(i, i + CHUNK));
    console.log(`[floors] ${Math.min(i + CHUNK, targets.length)}/${targets.length} | ${folded}줄 | ${((Date.now() - started) / 1000).toFixed(0)}s`);
  }
  return 0;
}

main()
  .then((code) => process.exit(code))
  .catch((e: unknown) => {
    console.error(`[floors] 실패: ${errorMessage(e)}`);
    process.exit(1);
  });
