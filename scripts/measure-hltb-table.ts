// HLTB 기록 인원수 → 순번 자리 보정표를 실측한다.
// 방법은 REVIEW_RANK_TABLE 주석이 적어 둔 것과 같다: 순번 보유 게임의 값을 내림차순으로 세워
// 100번째마다 읽는다. 즉 "그 자리를 차지한 게임이 실제로 가진 값" 이지 지어낸 경계가 아니다.
//
// 다만 표본을 그대로 쓰면 안 되는 사정이 있다(2026-09-21 실측). 순번 상위인데 HLTB 가 거의 없는
// 두 무리가 있다: 미출시작(GTA VI 5명, NBA 2K27 2명)과 한국, 아시아 라이브서비스 게임
// (블루 아카이브 40명, 이터널 리턴 3명). HLTB 는 서양 클리어 기록 커뮤니티라 후자가 구조적으로 낮다.
// 그 값들이 표본에 끼면 경계가 아래로 당겨지고, 그러면 HLTB 80명짜리가 100위 자리를 받는다.
// 그래서 거르기 전후를 같이 떠서 견준다.
import path from "node:path";
import { config as loadEnv } from "dotenv";
loadEnv({ path: path.resolve(process.cwd(), ".env.local"), quiet: true });
loadEnv({ quiet: true });
import { sql } from "drizzle-orm";
import { getDb } from "@/server/db/client";
import { POPULARITY_RANK_MAX_AGE_DAYS as AGE } from "@/lib/games/popularity";

const STEP = 100;

interface Row { rank: number; hltb: number; t: string; released: boolean }

/** 값 내림차순으로 STEP 번째마다 읽은 경계 */
function tableOf(rows: Row[]): Array<[number, number]> {
  const desc = rows.map((r) => r.hltb).sort((a, b) => b - a);
  const out: Array<[number, number]> = [];
  for (let i = STEP; i <= desc.length; i += STEP) out.push([i, desc[i - 1]]);
  return out;
}

function show(label: string, rows: Row[]) {
  const t = tableOf(rows);
  console.log(`\n--- ${label} (표본 ${rows.length}) ---`);
  console.log("  " + t.map(([p, n]) => `[${p}, ${n}]`).join(", "));
  const weak = t.findIndex(([, n]) => n < 50);
  if (weak >= 0) console.log(`  * 경계 50 미만이 ${t[weak][0]}자리부터 — 여기서 끊는 게 맞다`);
}

async function main() {
  const raw = await getDb().execute(sql`
    with a as (
      select gp.game_id,
        min(gp.popularity_rank) filter (where gp.popularity_rank_at >= now() - make_interval(days => ${AGE})) as min_rank,
        bool_or(gp.release_date is not null and gp.release_date <= current_date) as released
      from game_platforms gp join games g on g.id = gp.game_id
      where g.content_type='game' and g.visibility='public'
      group by gp.game_id)
    select a.min_rank, g.hltb_logged_count as hltb, coalesce(g.title_ko,g.title_en) as t, a.released
    from a join games g on g.id = a.game_id
    where a.min_rank is not null and g.hltb_logged_count is not null`);
  const raws = (raw.rows ?? raw) as Array<Record<string, unknown>>;
  const rows: Row[] = raws.map((r) => ({
    rank: Number(r.min_rank), hltb: Number(r.hltb), t: String(r.t), released: r.released === true,
  }));
  console.log(`표본 ${rows.length}건 (순번과 HLTB 값을 둘 다 가진 게임)`);
  if (rows.length < 400) { console.log("아직 부족하다 — 수집이 끝나면 다시 돈다."); return; }

  console.log("\n=== 순번 구간별 HLTB 중앙값 (단조로 떨어져야 쓸 수 있다) ===");
  const bands: Array<[number, number]> = [[1,100],[101,300],[301,600],[601,1000],[1001,1500],[1501,2000]];
  for (const [lo, hi] of bands) {
    const v = rows.filter((r) => r.rank >= lo && r.rank <= hi).map((r) => r.hltb).sort((a, b) => a - b);
    if (v.length === 0) { console.log(`  ${lo}~${hi}위: 표본 없음`); continue; }
    const med = v[Math.floor(v.length / 2)];
    console.log(`  ${String(lo).padStart(4)}~${String(hi).padStart(4)}위  표본 ${String(v.length).padStart(4)}  중앙값 ${String(med).padStart(7)}`);
  }

  const unreleased = rows.filter((r) => !r.released);
  console.log(`\n미출시(출시일 없음 또는 미래): ${unreleased.length}건, HLTB 중앙값 ${
    unreleased.length ? [...unreleased].sort((a,b)=>a.hltb-b.hltb)[Math.floor(unreleased.length/2)].hltb : "-"}`);

  show("전체", rows);
  show("출시작만", rows.filter((r) => r.released));
  show("출시작 + HLTB 50명 이상", rows.filter((r) => r.released && r.hltb >= 50));
}
main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
