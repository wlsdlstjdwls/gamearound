// 뉴스 게임 다시 맞추기 — pnpm news:rematch [--dry]
//
// 모아 둔 뉴스 전부를 지금 매칭 규칙(lib/news/game-match)으로 다시 판정해 game_id 를 고친다.
// 언제 돌리나: 매칭 규칙이나 문턱(sync/constants 의 NEWS_MATCH_KNOWN_*)을 바꿨을 때다.
// 피드에 다시 묻지 않는다 — 제목이 DB 에 있다. `--dry` 는 바뀔 건수와 표본만 찍고 쓰지 않는다.
//
// 바뀐 행만 쓴다(AGENTS §7). 떼어 낸 것(게임 → 없음)도 고침이다 — 틀린 뉴스가 상세에 뜨는 것보다 빈 칸이 낫다.
// 상세 캐시는 따로 깨지 않는다. 상세 페이지 캐시 수명 안에 저절로 바뀐다.
import path from "node:path";
import { config as loadEnv } from "dotenv";
import { sql } from "drizzle-orm";
import { getDb } from "@/server/db/client";
import { news } from "@/server/db/schema";
import type { AuditSource } from "@/server/db/audit";
import { matchNewsToGame } from "@/lib/news/game-match";
import { loadNewsMatchIndex } from "@/server/sync/run-news";
import { errorMessage } from "@/lib/errors";

loadEnv({ path: path.resolve(process.cwd(), ".env.local"), quiet: true });
loadEnv({ quiet: true });

/** 한 UPDATE 에 실을 행 수. VALUES 목록 하나로 묶어 왕복 수를 줄인다(Neon 왕복 1회가 비싸다) */
const CHUNK = 500;
const SAMPLE = 15;
/** 감사 칸에 남길 출처. 수집 크론(cron:news)이 쓴 판정을 고친 것이라 같은 갈래로 적는다 */
const SOURCE: AuditSource = "cron:news-rematch";

async function main(): Promise<number> {
  const dry = process.argv.includes("--dry");
  const db = getDb();
  const index = await loadNewsMatchIndex(db);
  const byId = new Map(index.map((g) => [g.id, g]));
  const rows = await db.select({ id: news.id, title: news.title, gameId: news.gameId }).from(news);

  const changes: Array<{ id: string; gameId: string | null }> = [];
  let detached = 0, attached = 0, moved = 0;
  const samples = { detach: [] as string[], attach: [] as string[], move: [] as string[] };
  for (const r of rows) {
    const next = matchNewsToGame(r.title, index)?.id ?? null;
    if (next === r.gameId) continue;
    changes.push({ id: r.id, gameId: next });
    const kind = !next ? "detach" : !r.gameId ? "attach" : "move";
    if (kind === "detach") detached++;
    else if (kind === "attach") attached++;
    else moved++;
    samples[kind].push(`${r.title.slice(0, 70)} | ${byId.get(r.gameId ?? "")?.slug ?? "-"} => ${next ? byId.get(next)?.slug : "-"}`);
  }
  console.log(`[news] 뉴스 ${rows.length}건 중 바뀔 것 ${changes.length}건 (떼기 ${detached}, 새로 붙기 ${attached}, 옮기기 ${moved})${dry ? ", --dry" : ""}`);
  // 갈래마다 고르게 섞어 찍는다 — 앞에서부터 자르면 오래된 뉴스만 보인다
  for (const [kind, list] of Object.entries(samples)) {
    console.log(`  -- ${kind}`);
    for (const s of list.sort(() => Math.random() - 0.5).slice(0, SAMPLE)) console.log(`  ${s}`);
  }
  if (dry || changes.length === 0) return 0;

  for (let i = 0; i < changes.length; i += CHUNK) {
    const part = changes.slice(i, i + CHUNK);
    const values = sql.join(part.map((c) => sql`(${c.id}::uuid, ${c.gameId}::uuid)`), sql`, `);
    await db.execute(sql`
      update ${news} set game_id = v.game_id, updated_source = ${SOURCE}, updated_by = null, updated_at = now()
      from (values ${values}) as v(id, game_id)
      where ${news.id} = v.id`);
    console.log(`[news] ${Math.min(i + CHUNK, changes.length)}/${changes.length}`);
  }
  return 0;
}

main()
  .then((code) => process.exit(code))
  .catch((e: unknown) => {
    console.error(`[news] 실패: ${errorMessage(e)}`);
    process.exit(1);
  });
