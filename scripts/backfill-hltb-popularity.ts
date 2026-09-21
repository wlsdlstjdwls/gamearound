// HLTB 기록 인원수 한 번 채우기 — pnpm hltb:popularity [--min-score=70] [--limit=N] [--ranked] [--dry]
//
// 왜 스크립트가 따로 있나: 이 값은 정규 수집이 이미 채운다(sync/run-meta 의 applyLoggedCount).
// 다만 그 경로는 **hltb ref 가 이미 붙은 게임**만 돈다. 정작 이 값이 필요한 게임들은 ref 조차 없다 —
// 2026-09-21 실측으로 인기 자리를 못 받는 게임 11,443건 중 hltb 가 이어진 것은 24건뿐이었다.
// 매칭 큐는 생성순이라 그 게임들의 차례는 앞선 미매칭 수천 건 뒤다.
//
// 그래서 대상을 **자리 없고 평단 점수가 있는 게임**으로 좁혀 매칭과 수집을 한 번에 돌린다.
// 왜 그 조건인가: 자리 없는 게임 대부분은 실제로 뒤에 있어야 할 것들이다(Xbox 백카탈로그가
// 7,367건인데 Halo 3, Mass Effect 3 같은 옛 명작이라 점수는 높아도 지금 인기작이 아니다).
// 놓치면 안 되는 것은 "평단이 인정했는데 우리 인기 축에 자리가 없는" 교집합이고, 그게 훨씬 작다 —
// 스위치 116건, Epic 25건. 그 안에 Mario Kart World(메타 86), Kirby Air Riders(88)가 있다.
//
// 규칙은 정규 수집을 그대로 불러 지킨다(matchGameToSource, applyLoggedCount).
// 여기에 두 번째 판정 규칙을 두면 한쪽만 고쳐지고, 어느 쪽이 값을 썼는지 못 가린다.
//
// --ranked 는 반대쪽을 채운다: **순번을 이미 가진** 게임의 HLTB 값이다. 보정표를 뜨는 데 쓴다 —
// 기록 인원수를 순번 자리로 바꾸려면 둘을 다 가진 게임에서 관계를 실측해야 한다
// (REVIEW_RANK_TABLE 을 뜬 방법과 같다). 이 모드는 매칭을 하지 않는다. ref 가 이미 있는 것만 돌아
// 건당 요청이 하나고, 없는 것까지 붙이러 가면 보정에 필요하지도 않은 일에 시간을 쓴다.
import path from "node:path";
import { config as loadEnv } from "dotenv";
import { sql } from "drizzle-orm";
import { getDb } from "@/server/db/client";
import { getMetaAdapter } from "@/server/adapters";
import { createContext, recordError } from "@/server/sync/context";
import { matchGameToSource } from "@/server/sync/match";
import { applyLoggedCount } from "@/server/sync/run-meta";
import { revalidateGameTags } from "@/server/sync/revalidate";
import { MATCHED_FOR_SYNC } from "@/server/sync/constants";
import { POPULARITY_RANK_MAX_AGE_DAYS, REVIEW_RANK_STEPS } from "@/lib/games/popularity";
import { sleep } from "@/lib/async";

loadEnv({ path: path.resolve(process.cwd(), ".env.local"), quiet: true });
loadEnv({ quiet: true });

/** 평단이 인정했다고 볼 최소 점수. 메타와 오픈크리틱 중 높은 쪽과 견준다 */
const DEFAULT_MIN_SCORE = 70;
/** 한 번에 도는 최대 건수. HLTB 는 매칭 1회 + 상세 1회라 건당 요청이 둘이다 */
const DEFAULT_LIMIT = 200;

const arg = (argv: string[], name: string): string | undefined =>
  argv.find((a) => a.startsWith(`--${name}=`))?.split("=")[1];

interface Target {
  gameId: string;
  slug: string;
  title: string;
  score: number;
  externalId: string | null;
}

/**
 * 자리 없는 게임 중 평단 점수가 기준을 넘는 것.
 *
 * "자리 없음" 의 정의는 목록 정렬(services/games/list)과 같아야 한다 — 거기서 자리를 받는 게임을
 * 여기서 대상으로 잡으면 요청만 쓰고 순서는 그대로다. 그래서 두 조건을 똑같이 쓴다:
 * 낡지 않은 실제 순번이 없고, 평가 수 보정표로도 자리를 못 받는 것.
 *
 * hltb ref 가 이미 쓸 수 있는 상태(auto, manual)면 매칭을 건너뛰고 수집만 한다.
 */
async function targetsOf(minScore: number, limit: number, ranked: boolean): Promise<Target[]> {
  const steps = REVIEW_RANK_STEPS.map(([position, reviews]) => sql`when a.max_rev >= ${reviews}::int then ${position}::int`);
  const raw = await getDb().execute(sql`
    with a as (
      select gp.game_id,
        min(gp.popularity_rank) filter (
          where gp.popularity_rank_at >= now() - make_interval(days => ${POPULARITY_RANK_MAX_AGE_DAYS})
        ) as min_rank,
        max(gp.user_score_count) filter (where gp.list_price > 0) as max_rev,
        greatest(max(gp.metacritic_score), max(gp.opencritic_score)) as score
      from game_platforms gp
      join games g on g.id = gp.game_id
      where g.content_type = 'game' and g.visibility = 'public' and g.crawl_excluded = false
      group by gp.game_id
    )
    select g.id as game_id, g.slug, coalesce(g.title_ko, g.title_en) as title, a.score,
           r.external_id as external_id
      from a
      join games g on g.id = a.game_id
      left join game_source_refs r
        on r.game_id = a.game_id and r.source = 'hltb'
       and r.matched_by in (${sql.join(MATCHED_FOR_SYNC.map((m) => sql`${m}`), sql`, `)})
       and r.external_id <> ''
     where ${
       ranked
         // 보정용: 순번을 가진 게임만. ref 가 없으면 매칭부터 해야 해서 대상에서 뺀다
         ? sql`a.min_rank is not null and r.external_id is not null`
         : sql`a.min_rank is null
       and (case ${sql.join(steps, sql` `)} else null end) is null
       and a.score >= ${minScore}::int`
     }
       and g.hltb_logged_count is null
     order by ${ranked ? sql`a.min_rank asc` : sql`a.score desc`}
     limit ${limit}::int
  `);
  return ((raw.rows ?? raw) as Array<Record<string, unknown>>).map((r) => ({
    gameId: String(r.game_id),
    slug: String(r.slug),
    title: String(r.title),
    score: r.score === null ? 0 : Number(r.score),
    externalId: r.external_id === null ? null : String(r.external_id),
  }));
}

async function main(): Promise<void> {
  const minScore = Number(arg(process.argv, "min-score") ?? DEFAULT_MIN_SCORE);
  const limit = Number(arg(process.argv, "limit") ?? DEFAULT_LIMIT);
  const dry = process.argv.includes("--dry");
  const ranked = process.argv.includes("--ranked");

  const targets = await targetsOf(minScore, limit, ranked);
  const what = ranked ? "순번 보유, 보정용" : `점수 ${minScore} 이상`;
  console.log(`[hltb:popularity] 대상 ${targets.length}건 (${what}${dry ? ", 예행" : ""})`);
  if (targets.length === 0) return;

  const adapter = getMetaAdapter("hltb");
  const ctx = await createContext("hltb");
  let matched = 0;
  let filled = 0;
  const started = Date.now();

  for (const t of targets) {
    try {
      let externalId = t.externalId;
      if (!externalId) {
        if (dry) { console.log(`  [예행] 매칭 필요: ${t.title}`); continue; }
        const r = await matchGameToSource(t.gameId, "hltb");
        // pending 은 사람이 판단할 대기표다. 그 상태로 값을 받으면 검수 전에 순서가 바뀐다
        if (r.decision !== "auto" || !r.externalId) { console.log(`  건너뜀(${r.decision}): ${t.title}`); continue; }
        externalId = r.externalId;
        matched++;
        await sleep(adapter.minIntervalMs);
      }
      const snapshot = await adapter.fetch(externalId);
      if (dry) { console.log(`  [예행] ${t.title}: ${snapshot.loggedCount ?? "값 없음"}`); continue; }
      const before = ctx.changedSlugs.size;
      await applyLoggedCount(ctx, { gameId: t.gameId, slug: t.slug, externalId }, snapshot);
      if (ctx.changedSlugs.size > before) {
        filled++;
        console.log(`  ${String(snapshot.loggedCount).padStart(7)}명  [${t.score}점] ${t.title}`);
      }
    } catch (e) {
      // 한 건의 실패가 배치를 멈추지 않는다 (§7)
      recordError(ctx, `hltb:${t.slug}`, e);
    }
    await sleep(adapter.minIntervalMs);
  }

  const secs = Math.round((Date.now() - started) / 1000);
  console.log(`[hltb:popularity] 새 매칭 ${matched}건, 값 채움 ${filled}건, 실패 ${ctx.failed}건, ${secs}초`);
  if (!dry && ctx.changedSlugs.size > 0) await revalidateGameTags([...ctx.changedSlugs]);
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
