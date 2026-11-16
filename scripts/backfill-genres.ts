// 장르 한 번 채우기 — pnpm genres:backfill [--source=xbox] [--limit=N] [--dry]
//
// 왜 스크립트가 따로 있나: 장르는 2026-11-16 전까지 게임을 만들 때만 붙었고, Xbox 어댑터는 장르를 아예 주지 않았다.
// 이제 정규 수집이 빈 장르를 채우지만(sync/genres.fillMissingGenres) 가격 갱신 차례가 온 게임만 건드린다.
// 이 스크립트는 장르가 빈 게임만 골라 배치 조회로 한 번에 묻는다. 반영은 정규 수집과 같은 함수를 부른다 — 규칙이 두 벌이 되지 않게.
//
// 소스: 배치 조회(fetchMany)가 장르를 주는 곳만. 스팀은 GetItems 의 태그(STEAM_GENRE_TAG_IDS 에 있는 것만 장르로 읽는다),
// Xbox 는 Categories(adapters/xbox-genres). 닌텐도 배치는 가격 API 라 장르가 없고, Epic 질의에는 장르 필드가 없다.
import path from "node:path";
import { config as loadEnv } from "dotenv";
import { and, eq, inArray, sql } from "drizzle-orm";
import { getDb } from "@/server/db/client";
import { gameGenres, gameSourceRefs, games } from "@/server/db/schema";
import { getStoreAdapter, type StoreSource } from "@/server/adapters";
import { fillMissingGenres } from "@/server/sync/genres";
import { MATCHED_FOR_SYNC } from "@/server/sync/constants";
import { revalidateGameTags } from "@/server/sync/revalidate";
import { sleep } from "@/lib/async";
import { errorMessage } from "@/lib/errors";

loadEnv({ path: path.resolve(process.cwd(), ".env.local"), quiet: true });
loadEnv({ quiet: true });

/** 배치 조회가 장르를 주는 소스 */
const GENRE_SOURCES: StoreSource[] = ["steam", "xbox"];

function parseArg(argv: string[], name: string): string | undefined {
  return argv.find((a) => a.startsWith(`--${name}=`))?.split("=")[1];
}

async function targetsOf(source: StoreSource, limit: number) {
  return getDb()
    .select({ gameId: games.id, slug: games.slug, externalId: gameSourceRefs.externalId })
    .from(games)
    .innerJoin(gameSourceRefs, eq(gameSourceRefs.gameId, games.id))
    .where(
      and(
        sql`not exists (select 1 from ${gameGenres} gg where gg.game_id = ${games.id})`,
        eq(gameSourceRefs.source, source),
        inArray(gameSourceRefs.matchedBy, MATCHED_FOR_SYNC),
        sql`${gameSourceRefs.externalId} <> ''`,
        eq(gameSourceRefs.missingStreak, 0),
      ),
    )
    .limit(limit);
}

async function runSource(source: StoreSource, limit: number, dry: boolean): Promise<number> {
  const targets = await targetsOf(source, limit);
  const adapter = getStoreAdapter(source);
  if (targets.length === 0 || !adapter.fetchMany) {
    console.log(`[genres:${source}] 대상 ${targets.length}건${adapter.fetchMany ? "" : ", 배치 조회 없음"}`);
    return 0;
  }
  const size = adapter.batchSize ?? 20;
  console.log(`[genres:${source}] 대상 ${targets.length}건, 묶음 ${size}`);
  let filled = 0;
  let failed = 0;
  const slugs: string[] = [];
  for (let i = 0; i < targets.length; i += size) {
    const chunk = targets.slice(i, i + size);
    try {
      const snaps = await adapter.fetchMany(chunk.map((t) => t.externalId));
      const items = chunk.map((t) => ({ gameId: t.gameId, genres: snaps.get(t.externalId)?.meta?.genres }));
      if (dry) {
        filled += items.filter((it) => (it.genres ?? []).length > 0).length;
      } else {
        const done = new Set(await fillMissingGenres(getDb(), items));
        filled += done.size;
        for (const t of chunk) if (done.has(t.gameId)) slugs.push(t.slug);
      }
    } catch (e) {
      // 묶음 하나가 깨져도 다음 묶음은 계속 간다 (§7)
      failed++;
      if (failed <= 3) console.warn(`[genres:${source}] 묶음 ${i} 실패: ${errorMessage(e)}`);
    }
    if ((i / size) % 10 === 0) console.log(`[genres:${source}] ${Math.min(i + size, targets.length)}/${targets.length} | 채움 ${filled} | 실패 묶음 ${failed}`);
    await sleep(adapter.minIntervalMs);
  }
  if (!dry && slugs.length > 0) {
    try {
      await revalidateGameTags(slugs);
    } catch (e) {
      console.warn(`[genres:${source}] 캐시 무효화 실패(값은 들어갔다): ${errorMessage(e)}`);
    }
  }
  console.log(`[genres:${source}] 끝. 채움 ${filled}${dry ? " (dry, 쓰지 않음)" : ""}, 실패 묶음 ${failed}`);
  return filled;
}

async function main(): Promise<number> {
  const argv = process.argv.slice(2);
  const only = parseArg(argv, "source") as StoreSource | undefined;
  const limit = Number(parseArg(argv, "limit") ?? 0) || Number.MAX_SAFE_INTEGER;
  const dry = argv.includes("--dry");
  if (only && !GENRE_SOURCES.includes(only)) {
    console.error(`[genres] ${only} 는 배치 조회로 장르를 주지 않는다 (머리 주석)`);
    return 1;
  }
  for (const s of only ? [only] : GENRE_SOURCES) await runSource(s, limit, dry);
  return 0;
}

main().then(
  (code) => process.exit(code),
  (e) => {
    console.error(errorMessage(e));
    process.exit(1);
  },
);
