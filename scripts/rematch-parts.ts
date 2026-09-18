// 부품 재매칭 — pnpm parts:rematch [--all]
//
// 사양 원문에서 부품 후보를 다시 뽑아 game_requirement_parts 를 갈아 끼운다.
// 기본은 **아직 안 뽑았거나 낡은 판으로 뽑은 행**만 본다. `--all` 은 전부 다시 돈다.
//
// 언제 돌리나: 티어표(lib/hardware)나 매칭 규칙을 고쳤을 때다. 그때 PART_MATCH_VERSION 을 올리면
// 이 스크립트가 낡은 행만 골라 다시 돈다 — **스토어에 다시 묻지 않는다**. 사양 원문을 DB 에
// 남겨 둔 값어치가 여기서 나온다(schema 의 game_requirements.raw_html 주석).
import path from "node:path";
import { config as loadEnv } from "dotenv";
import { eq, inArray, or, sql } from "drizzle-orm";
import { getDb } from "@/server/db/client";
import { gameRequirementParts, gameRequirements } from "@/server/db/schema";
import { PART_MATCH_VERSION } from "@/lib/hardware";
import { createContext } from "@/server/sync/context";
import { planRequirementParts } from "@/server/sync/requirements";
import { refreshFloors } from "@/server/sync/requirement-floors";
import { runStatements } from "@/server/sync/store-apply";
import { errorMessage } from "@/lib/errors";

loadEnv({ path: path.resolve(process.cwd(), ".env.local"), quiet: true });
loadEnv({ quiet: true });

/** 한 묶음에서 다시 매길 사양 행 수. 쓰기 문장이 행마다 둘이라 이 값의 두 배가 배치에 들어간다 */
const CHUNK = 200;

async function main(): Promise<number> {
  const all = process.argv.includes("--all");
  const db = getDb();

  // 낡은 판으로 매긴 행 고르기: 후보가 아예 없거나(아직 안 돌린 행) 판이 낮은 행.
  // 후보가 없는 것이 "부품을 못 찾았다" 일 수도 있어서, 판을 행에 적어 둔 후보 하나라도 있으면 최신으로 본다
  const stale = db
    .select({ id: gameRequirements.id })
    .from(gameRequirements)
    .leftJoin(gameRequirementParts, eq(gameRequirementParts.requirementId, gameRequirements.id))
    .groupBy(gameRequirements.id)
    .having(
      or(
        sql`count(${gameRequirementParts.id}) = 0`,
        sql`min(${gameRequirementParts.matchVersion}) < ${PART_MATCH_VERSION}`,
      ),
    );

  const targets = all
    ? await db.select({ id: gameRequirements.id }).from(gameRequirements)
    : await stale;
  console.log(`[parts] 다시 매길 사양 행 ${targets.length}건 (판 ${PART_MATCH_VERSION}${all ? ", --all" : ""})`);
  if (targets.length === 0) return 0;

  const ctx = await createContext("steam");
  const started = Date.now();
  for (let i = 0; i < targets.length; i += CHUNK) {
    const ids = targets.slice(i, i + CHUNK).map((t) => t.id);
    const rows = await db
      .select({ id: gameRequirements.id, gameId: gameRequirements.gameId, cpuText: gameRequirements.cpuText, gpuText: gameRequirements.gpuText })
      .from(gameRequirements)
      .where(inArray(gameRequirements.id, ids));
    await runStatements(ctx, "parts-rematch", planRequirementParts(ctx, rows));
    // 후보가 바뀌면 접힌 문턱도 낡는다 — 여기서 같이 접지 않으면 목록 필터만 옛 사전으로 답한다
    await refreshFloors(ctx, [...new Set(rows.map((r) => r.gameId))]);
    console.log(`[parts] ${Math.min(i + CHUNK, targets.length)}/${targets.length} | ${((Date.now() - started) / 1000).toFixed(0)}s`);
  }
  return 0;
}

main()
  .then((code) => process.exit(code))
  .catch((e: unknown) => {
    console.error(`[parts] 실패: ${errorMessage(e)}`);
    process.exit(1);
  });
