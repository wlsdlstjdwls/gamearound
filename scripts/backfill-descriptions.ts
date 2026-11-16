// 게임 설명 한 번 채우기 — pnpm descriptions:backfill [--limit=N] [--dry]
//
// 왜 스크립트가 따로 있나: 한국 닌텐도 어댑터는 2026-11-16 전까지 상품 페이지의 메이커 소개글을 버렸다.
// 그래서 스팀, Xbox, Epic 이 없는 닌텐도 게임은 설명이 전부 비어 있었다(실측 본편 약 6,000건).
// 소개글을 읽게 고친 뒤에도 정규 수집은 이 빈칸을 못 메운다 — 이미 등록된 게임의 가격은 가격 API 배치로 묻고
// (nintendoAdapter.batchPricesOnly = "detail"), 상품 HTML 은 신규 등록 때만 받기 때문이다.
// 이 스크립트는 설명이 빈 닌텐도 게임만 골라 상품 HTML 을 한 번씩 다시 받는다.
//
// 반영하는 것은 description 한 칸뿐이다. 잠긴 필드와 "빈 칸만 채운다" 규칙은 planGameMeta 를 그대로 불러 지킨다
// (닌텐도는 META_OVERWRITE_SOURCES 가 아니라 스팀 설명을 덮지 않는다). 가격, 제목, 이미지는 정규 수집 몫이다.
//
// 한국 eShop 은 한국 밖 IP 에 빈 본문을 준다(parse-kr 의 requireBody). 가정용 회선이나 CRAWL_PROXY_URL 로 돌린다.
// 다시 돌리면 아직 빈 게임만 다시 고르므로 중간에 끊겨도 이어서 돌리면 된다.
import path from "node:path";
import { config as loadEnv } from "dotenv";
import { and, eq, inArray, sql } from "drizzle-orm";
import { getDb } from "@/server/db/client";
import { gameSourceRefs, games } from "@/server/db/schema";
import { getStoreAdapter } from "@/server/adapters";
import type { StoreSnapshot } from "@/server/adapters/types";
import { createContext, recordError } from "@/server/sync/context";
import { planGameMeta, type GameRow } from "@/server/sync/game-writer";
import { runStatements } from "@/server/sync/store-apply";
import { MATCHED_FOR_SYNC } from "@/server/sync/constants";
import { revalidateGameTags } from "@/server/sync/revalidate";
import { sleep } from "@/lib/async";
import { errorMessage } from "@/lib/errors";

loadEnv({ path: path.resolve(process.cwd(), ".env.local"), quiet: true });
loadEnv({ quiet: true });

/** 소개글을 주는 소스. 일본 eShop 은 검색 JSON 에 소개글이 없고, 있어도 일본어라 usableDescription 이 버린다 */
const SOURCE = "nintendo" as const;
/** 몇 건마다 DB 에 쓰나. 끊겨도 잃는 몫이 이만큼이고, 쓰기 왕복 수(neon-roundtrip-cost)는 이것으로 나뉜다 */
const WRITE_CHUNK = 20;

function parseArg(argv: string[], name: string): string | undefined {
  return argv.find((a) => a.startsWith(`--${name}=`))?.split("=")[1];
}

/** 설명이 빈 게임 중 한국 닌텐도로 다시 물을 수 있는 것. matched_by='none' 은 "찾아봤지만 없더라" 표식이라 뺀다 */
async function targets(limit: number) {
  return getDb()
    .select({ gameId: games.id, slug: games.slug, externalId: gameSourceRefs.externalId })
    .from(games)
    .innerJoin(gameSourceRefs, eq(gameSourceRefs.gameId, games.id))
    .where(
      and(
        sql`coalesce(${games.description}, '') = ''`,
        eq(gameSourceRefs.source, SOURCE),
        inArray(gameSourceRefs.matchedBy, MATCHED_FOR_SYNC),
        sql`${gameSourceRefs.externalId} <> ''`,
        // 죽은 ref(상품이 내려감)는 다시 물어도 404 다 — 정규 수집의 제외 기준과 같다
        eq(gameSourceRefs.missingStreak, 0),
      ),
    )
    // 본편 먼저 — 사람이 상세를 여는 쪽이다
    .orderBy(sql`${games.contentType} = 'game' desc`)
    .limit(limit);
}

async function main(): Promise<number> {
  const argv = process.argv.slice(2);
  const limit = Number(parseArg(argv, "limit") ?? 0) || Number.MAX_SAFE_INTEGER;
  const dry = argv.includes("--dry");

  const list = await targets(limit);
  if (list.length === 0) {
    console.log("[descriptions] 대상 없음");
    return 0;
  }
  const adapter = getStoreAdapter(SOURCE);
  const ctx = await createContext(SOURCE);
  const db = ctx.db;
  console.log(`[descriptions] 대상 ${list.length}건, 간격 ${adapter.minIntervalMs}ms`);

  let filled = 0;
  let empty = 0;
  let failed = 0;
  const started = Date.now();
  for (let i = 0; i < list.length; i += WRITE_CHUNK) {
    const chunk = list.slice(i, i + WRITE_CHUNK);
    const found = new Map<string, NonNullable<StoreSnapshot["meta"]>>();
    for (const t of chunk) {
      try {
        const snap = await adapter.fetch(t.externalId);
        if (snap.meta) found.set(t.gameId, snap.meta);
      } catch (e) {
        // 항목 하나의 실패가 전체를 멈추지 않는다 (§7)
        failed++;
        recordError(ctx, `description:${t.slug}`, e);
      }
      await sleep(adapter.minIntervalMs);
    }

    // 현재 행을 읽어야 planGameMeta 가 "이미 있는 값" 과 잠금을 판단한다
    const rows = await db.select().from(games).where(inArray(games.id, chunk.map((t) => t.gameId)));
    const cur = new Map<string, GameRow>(rows.map((r) => [r.id, r]));
    const updates: Array<{ gameId: string; slug: string; description: string }> = [];
    for (const t of chunk) {
      const meta = found.get(t.gameId);
      const row = cur.get(t.gameId);
      if (!meta || !row) continue;
      const set = planGameMeta(ctx, row, meta);
      if (typeof set.description === "string" && set.description) updates.push({ gameId: t.gameId, slug: t.slug, description: set.description });
      else empty++;
    }

    if (!dry && updates.length > 0) {
      await runStatements(
        ctx,
        "description",
        updates.map((u) => db.update(games).set({ description: u.description, updatedAt: ctx.now }).where(eq(games.id, u.gameId))),
      );
    }
    for (const u of updates) ctx.changedSlugs.add(u.slug);
    filled += updates.length;
    console.log(
      `[descriptions] ${Math.min(i + WRITE_CHUNK, list.length)}/${list.length} | 채움 ${filled} | 소개글 없음 ${empty} | 오류 ${failed} | ${((Date.now() - started) / 1000).toFixed(0)}s`,
    );
    if (dry && updates[0]) console.log(`  예: ${updates[0].slug} = ${updates[0].description.slice(0, 80)}`);
  }

  if (!dry && ctx.changedSlugs.size > 0) {
    try {
      await revalidateGameTags(Array.from(ctx.changedSlugs));
    } catch (e) {
      console.warn(`[descriptions] 캐시 무효화 실패(값은 들어갔다): ${errorMessage(e)}`);
    }
  }
  if (ctx.errors.length > 0) console.warn(`[descriptions] 오류 표본: ${ctx.errors.slice(0, 3).join(" | ")}`);
  console.log(`[descriptions] 끝. 채운 게임 ${filled}건${dry ? " (dry, 쓰지 않음)" : ""}`);
  return 0;
}

main().then(
  (code) => process.exit(code),
  (e) => {
    console.error(errorMessage(e));
    process.exit(1);
  },
);
