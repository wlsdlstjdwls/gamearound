/**
 * 일회성 백필 — 검색 별칭(game_aliases)을 인기순으로 채운다.
 *
 * 왜 따로 도나: 규칙은 이미 정기 수집에 있다(run-meta 의 wikidata_game). 그런데 그 큐는
 * **ref 가 이미 있는 게임**만 돈다. ref 를 만드는 쪽(match)은 배치 40건에 오래된 생성일 순이라
 * 사람이 실제로 검색하는 게임에 닿기까지 카탈로그 14,735건을 다 지나야 한다.
 * 2026-09-17 실측: 별칭이 달린 게임 26건, 별칭 행 49개, wikidata_game ref 129개.
 *
 * 무엇이 풀리나: 별칭이 있어야 "야생의 숨결", "야숨" 으로 "젤다의 전설 브레스 오브 더 와일드" 가
 * 잡힌다. 통칭은 제목 어디에도 없어서 별칭 말고는 닿을 길이 없다(services/games/title-search).
 *
 * 규칙은 새로 쓰지 않고 수집 것을 그대로 부른다(matchGameToSource, usefulAliases, applyAliases).
 * 따로 쓰면 임계값과 "사람이 넣은 별칭은 안 건드린다" 판단이 두 벌이 된다.
 *
 * 순서는 유저 평가 수(user_score_count)로 잡는다 — 우리가 가진 것 중 "사람이 많이 산 게임" 에
 * 가장 가까운 값이다. 평론가 점수는 오래된 명작에 쏠리고, 가격은 인기와 무관하다.
 *
 * --hangul 이 따로 있는 이유: 유저 평가 수는 스팀과 Xbox 만 준다(닌텐도, Epic 은 공개 점수가 없다).
 * 그래서 한국 스토어에서만 파는 게임은 점수축이 통째로 비어 순서의 맨 뒤로 밀린다
 * (2026-09-17 실측: 본편 14,735 중 3,739건이 어떤 점수축도 없고, 브레스 오브 더 와일드가 그 안에 있다).
 * 정작 통칭 검색이 필요한 쪽이 그쪽이라 먼저 돌 수 있게 갈래를 둔다(한글 제목 본편 1,021건, 약 1.4시간).
 *
 * 쓰는 법: pnpm tsx scripts/backfill-game-aliases.ts [--apply] [--limit=N] [--hangul] [--slug=...]
 *   --slug 는 한 건만 골라 돈다 — 순서 뒤쪽에 있는 게임을 먼저 확인할 때 쓴다.
 *   --apply 없이 돌리면 무엇이 붙을지만 찍는다(DB 쓰기 없음). 다 돌린 뒤에는 이 파일을 지운다.
 *
 * 한 건에 5초 걸린다(위키데이터 간격). 14,614건을 한 번에 돌 수 없으니 --limit 으로 나눠 돈다.
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { sql } from "drizzle-orm";
import { getDb } from "@/server/db/client";
import { getMetaAdapter } from "@/server/adapters";
import { usefulAliases } from "@/server/adapters/wikidata/game";
import { applyAliases } from "@/server/sync/alias-writer";
import { loadLockedFields, type Ctx } from "@/server/sync/context";
import { matchGameToSource } from "@/server/sync/match";
import { fetchWithRetry } from "@/server/sync/retry";
import { revalidateGameTags } from "@/server/sync/revalidate";
import { errorMessage } from "@/lib/errors";
import { sleep } from "@/lib/async";

const SOURCE = "wikidata_game" as const;

const apply = process.argv.includes("--apply");
/** 한글 제목 게임만 — 점수축이 비어 순서 뒤로 밀리는 쪽을 먼저 돌 때 */
const hangulOnly = process.argv.includes("--hangul");
/** 한 건만. 순서를 기다리지 않고 특정 게임을 확인할 때 */
const slugArg = process.argv.find((a) => a.startsWith("--slug="));
const onlySlug = slugArg ? slugArg.slice("--slug=".length) : null;
const limitArg = process.argv.find((a) => a.startsWith("--limit="));
const limit = limitArg ? Number(limitArg.slice("--limit=".length)) : 100;

interface Row extends Record<string, unknown> {
  id: string;
  slug: string;
  titleEn: string;
  titleKo: string | null;
}

/**
 * 별칭이 아직 없는 본편을 인기순으로. DLC 와 에디션은 뺀다 — 별칭은 본편에 붙고
 * 자식은 부모를 통해 찾는다(match 의 큐와 같은 이유, 거기 주석 참고).
 *
 * "ref 가 있는데 별칭이 없는" 게임도 대상이다 — 매칭만 되고 조회 차례를 못 받은 것들이라
 * 여기서 한 번에 끝낸다. matchGameToSource 가 auto 를 다시 덮어쓰지 않으므로 재실행이 안전하다.
 */
async function listTargets(db: Ctx["db"]): Promise<Row[]> {
  // --slug 가 있으면 그 한 건이 전부다 — 별칭이 이미 있어도 다시 본다(확인용이라 재실행이 목적)
  if (onlySlug) {
    const one = await db.execute<Row>(sql`
      select g.id, g.slug, g.title_en as "titleEn", g.title_ko as "titleKo"
      from games g where g.slug = ${onlySlug}
    `);
    return one.rows as Row[];
  }
  const hangul = hangulOnly ? sql`and (g.title_ko ~ '[가-힣]' or g.title_en ~ '[가-힣]')` : sql``;
  // 이미 "후보 없음" 으로 끝난 행(matched_by = 'none')은 다시 세우지 않는다. 그 기록이 곧 재검색 방지표다 —
  // 2026-09-18 실측: 한글 큐 앞 300건 중 75건이 지난 회차에 죽은 행이라 같은 빈손을 되풀이하고 있었다.
  const rows = await db.execute<Row>(sql`
    select g.id, g.slug, g.title_en as "titleEn", g.title_ko as "titleKo"
    from games g
    left join game_platforms p on p.game_id = g.id
    left join game_source_refs r on r.game_id = g.id and r.source = 'wikidata_game'
    where g.content_type = 'game'
      and not exists (select 1 from game_aliases a where a.game_id = g.id)
      and not exists (
        select 1 from game_source_refs d
        where d.game_id = g.id and d.source = 'wikidata_game' and d.matched_by = 'none')
      ${hangul}
    group by g.id
    -- 안 본 것 먼저, 그다음 오래 전에 본 것. 이게 없으면 별칭이 안 붙는 행들이 큐의 머리를 영원히 막는다
    order by max(r.updated_at) asc nulls first,
             max(p.user_score_count) desc nulls last,
             max(greatest(p.metacritic_score, p.opencritic_score)) desc nulls last,
             max(p.release_date) desc nulls last,
             g.created_at
    limit ${limit}
  `);
  return rows.rows as Row[];
}

async function main(): Promise<void> {
  const db = getDb();
  const adapter = getMetaAdapter(SOURCE);
  const targets = await listTargets(db);
  console.log(`대상 ${targets.length}건 (${apply ? "적용" : "미리보기"})`);

  const locks = await loadLockedFields(db);
  const ctx = {
    db,
    source: SOURCE,
    now: new Date(),
    locks,
    processed: 0,
    failed: 0,
    errors: [],
    changedSlugs: new Set<string>(),
    changedCompanySlugs: new Set<string>(),
    priceChanges: [],
    droppedPrices: 0,
    touched: new Map(),
  } satisfies Ctx;

  let added = 0;
  let unmatched = 0;
  let empty = 0;
  let failed = 0;

  for (const [i, t] of targets.entries()) {
    try {
      // 위키데이터 공개 SPARQL 은 502 를 곧잘 뱉는다(2026-09-17 실측, 20건에 2건).
      // 한 바퀴가 몇 시간짜리라 일시적 실패로 자리를 비우면 다시 채울 방법이 없다 — 수집과 같이 재시도한다.
      const match = await fetchWithRetry(() => matchGameToSource(t.id, SOURCE));
      // auto 만 쓴다. pending 은 사람이 볼 대기표라 그 판단을 별칭으로 앞질러 가지 않는다
      if (match.decision !== "auto" || !match.externalId) {
        unmatched++;
        console.log(`미매칭 | ${t.slug} | ${match.decision}`);
        continue;
      }

      const entityId = match.externalId;
      const snapshot = await fetchWithRetry(() => adapter.fetch(entityId));
      const aliases = usefulAliases(snapshot.aliases ?? [], t.titleKo ?? t.titleEn);
      if (aliases.length === 0) {
        empty++;
        continue;
      }

      console.log(`${apply ? "붙임" : "예정"} | ${t.slug} | ${match.externalId} | ${aliases.join(", ")}`);
      if (apply) {
        const r = await applyAliases(ctx, t.id, t.slug, SOURCE, aliases);
        added += r.added;
      }
    } catch (e) {
      failed++;
      console.warn(`실패 | ${t.slug} | ${errorMessage(e)}`);
    }
    // 본 자리에 흔적을 남긴다 — 별칭이 안 붙은 행도 "봤다" 가 남아야 다음 회차가 다음 줄로 넘어간다
    if (apply) {
      await db.execute(sql`
        update game_source_refs set updated_at = now()
        where game_id = ${t.id}::uuid and source = 'wikidata_game'`);
    }
    if (i < targets.length - 1) await sleep(adapter.minIntervalMs);
  }

  console.log(`\n별칭 ${added}개 | 미매칭 ${unmatched} | 별칭없음 ${empty} | 실패 ${failed}`);
  if (apply && ctx.changedSlugs.size > 0) await revalidateGameTags([...ctx.changedSlugs]);
}

main();
