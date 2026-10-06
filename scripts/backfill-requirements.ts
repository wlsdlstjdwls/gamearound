// 사양 1회 백필 — pnpm requirements:backfill [--limit=N] [--source=steam] [--korean]
//
// 왜 크롤 워크플로가 아니라 여기인가: 사양은 배치로 못 받아 게임 1개가 요청 1회다.
// 스팀 본편이 3,493건(2026-09-18 실측)이라 요청 간격 1.5초면 한 바퀴가 약 87분인데,
// crawl-prices 는 이미 Actions 무료 한도에 붙어 있다(워크플로 주석의 실측).
// 그래서 백필은 로컬 회선이 맡는다 — LOCAL_SEED_SOURCES 를 로컬로 옮긴 것과 같은 이유다("분이 아까워서").
//
// 사양은 거의 안 변해서 이 작업은 **한 번이면 끝난다.** 그 뒤의 신규분은 수집 경로가 조금씩 따라잡는다
// (sync/requirements 의 REQUIREMENTS_PER_RUN).
//
// 중단해도 손해가 없다. 물어본 행은 game_platforms.requirements_listed_at 이 찍혀 있어
// 다시 돌리면 아직 안 물어본 행부터 이어서 간다.
//
// --korean: 한국어 지원(ko_text)이 빈 행을 사양째 다시 묻는다. 한국어 칸은 2026-10-06 에 생겼는데,
// 그 전에 사양을 물어본 행은 REQUIREMENTS_REFRESH_DAYS(180일) 동안 수집 경로가 다시 묻지 않는다.
// 응답이 언어를 말하지 않는 게임은 계속 비어 있으므로, 다시 돌리면 그 행들을 또 묻는다.
import path from "node:path";
import { config as loadEnv } from "dotenv";
import { and, eq, inArray, isNull, type SQL } from "drizzle-orm";
import { getDb } from "@/server/db/client";
import { gamePlatforms, games } from "@/server/db/schema";
import { getStoreAdapter, isSource, isStoreSource } from "@/server/adapters";
import { createContext } from "@/server/sync/context";
import { syncRequirements } from "@/server/sync/requirements";
import { SOURCE_PLATFORMS, SOURCE_REGION } from "@/server/sync/constants";
import { revalidateGameTags } from "@/server/sync/revalidate";
import { errorMessage } from "@/lib/errors";

loadEnv({ path: path.resolve(process.cwd(), ".env.local"), quiet: true });
loadEnv({ quiet: true });

/** 한 묶음에서 물어볼 건수. 작게 끊는 이유는 중단 지점이 그만큼 촘촘해지기 때문이다 */
const CHUNK = 50;

function parseArg(argv: string[], name: string): string | undefined {
  return argv.find((a) => a.startsWith(`--${name}=`))?.split("=")[1];
}

async function main(): Promise<number> {
  const argv = process.argv.slice(2);
  const source = parseArg(argv, "source") ?? "steam";
  if (!isSource(source) || !isStoreSource(source)) {
    console.error(`--source 는 스토어 소스여야 합니다: ${source}`);
    return 1;
  }
  const adapter = getStoreAdapter(source);
  if (!adapter.fetchRequirements) {
    console.error(`[requirements] ${source} 는 사양을 주지 않습니다 (어댑터에 fetchRequirements 가 없다)`);
    return 1;
  }
  const limit = Number(parseArg(argv, "limit") ?? 0) || Number.MAX_SAFE_INTEGER;
  const korean = argv.includes("--korean");
  const pendingWhere: SQL = korean ? isNull(gamePlatforms.koText) : isNull(gamePlatforms.requirementsListedAt);

  const db = getDb();
  // 아직 한 번도 안 물어본 본편만. 이미 물어본 행은 수집 경로가 REQUIREMENTS_REFRESH_DAYS 로 관리한다
  const pending = await db
    .select({ gameId: gamePlatforms.gameId, slug: games.slug })
    .from(gamePlatforms)
    .innerJoin(games, eq(games.id, gamePlatforms.gameId))
    .where(
      and(
        inArray(gamePlatforms.platform, SOURCE_PLATFORMS[source]),
        eq(gamePlatforms.region, SOURCE_REGION[source]),
        eq(games.contentType, "game"),
        pendingWhere,
      ),
    );
  const targets = pending.slice(0, limit);
  console.log(`[requirements] ${source}: ${korean ? "한국어 칸이 빈" : "아직 안 물어본"} 본편 ${pending.length}건 중 ${targets.length}건을 돕니다`);
  if (targets.length === 0) return 0;

  const started = Date.now();
  let received = 0;
  for (let i = 0; i < targets.length; i += CHUNK) {
    const chunk = targets.slice(i, i + CHUNK);
    const ctx = await createContext(source);
    // syncRequirements 는 "이번 배치에서 갱신한 것" 을 받는 모양이라, 백필도 같은 모양으로 넘긴다.
    // snapshot 은 종류 판정에만 쓰여서 최소한만 채운다 — 대상은 이미 본편으로 걸러 왔다
    const applied = chunk.map((t) => ({
      gameId: t.gameId,
      slug: t.slug,
      snapshot: { contentType: "game" as const, platform: SOURCE_PLATFORMS[source][0], storeExternalId: "", storeUrl: "", listPrice: null, currentPrice: null, discountPct: null },
    }));
    try {
      // --korean 이면 이미 물어본 행도 다시 묻는다(기다림 0일)
      received += await syncRequirements(ctx, source, adapter, applied, chunk.length, korean ? 0 : undefined);
      await revalidateGameTags(Array.from(ctx.changedSlugs));
    } catch (e) {
      // 묶음 하나가 죽어도 다음 묶음은 간다 — 다시 돌리면 못 물어본 행부터 이어진다
      console.warn(`[requirements] 묶음 실패 (${i}~${i + chunk.length}): ${errorMessage(e)}`);
    }
    const sec = ((Date.now() - started) / 1000).toFixed(0);
    console.log(`[requirements] ${Math.min(i + CHUNK, targets.length)}/${targets.length} | 사양 ${received}행 | ${sec}s`);
  }
  return 0;
}

main()
  .then((code) => process.exit(code))
  .catch((e: unknown) => {
    console.error(`[requirements] 실패: ${errorMessage(e)}`);
    process.exit(1);
  });
