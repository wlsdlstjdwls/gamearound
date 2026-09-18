// 외부 ID 축 중복을 센다 — 접을 수 있는 것과 스토어 구조를 갈라서.
//
//   pnpm dedup:measure
//
// **왜 대본으로 남기나.** 이 셈을 회차마다 임시 대본으로 다시 짜고, 그때마다 같은 함정에 다시 빠졌다.
// 함정 둘:
//   1. `matched_by = 'none'` 은 미매칭 기록이다. 안 빼면 599로 세어지고 그중 381이 가짜다
//   2. **PlayStation 의 콘셉트 번호는 제품군 단위다.** 별개 게임이 한 번호를 나눠 갖는다
//      (`Marvel's Spider-Man 2` 와 `Spider-Man Remastered`, `Fortnite` 와 `Rocket Racing`).
//      그 축을 중복으로 세면 **아무리 접어도 줄지 않는 수**를 매 회차 다시 보게 된다.
//
// 그래서 psstore 는 총계에서 빼고 따로 적는다. 다만 그 안에도 진짜 중복은 있어서
// (제목까지 같은 묶음, 실측 2026-09-18: 74묶음 중 1건) 그 수만 따로 센다 — 그건 접을 대상이다.
import path from "node:path";
import { config as loadEnv } from "dotenv";
loadEnv({ path: path.resolve(process.cwd(), ".env.local"), quiet: true });

import { sql } from "drizzle-orm";
import { getDb } from "@/server/db/client";

/** 제품군 단위 식별자를 쓰는 소스 — 한 번호에 여러 게임이 정상이라 중복 총계에서 뺀다 */
const FAMILY_ID_SOURCES = ["psstore"] as const;

const NORM = (col: string) => `lower(regexp_replace(${col}, '[^[:alnum:]]+', '', 'g'))`;
const BASE = `
with refs as (
  select game_id, source, external_id from game_source_refs where matched_by <> 'none'
), grp as (
  select source, external_id, array_agg(game_id) as ids, count(*) as n
  from refs group by 1, 2 having count(*) > 1
), shape as (
  select g.*,
    (select count(*) from games x where x.id = any(g.ids) and x.content_type = 'game') as mains,
    (select count(distinct ${NORM("x.title_en")}) from games x where x.id = any(g.ids)) as titles,
    (select count(*) from games c where c.parent_game_id = any(g.ids)) as kids
  from grp g
)`;

async function rows(text: string): Promise<Record<string, unknown>[]> {
  return (await getDb().execute(sql.raw(text))).rows as Record<string, unknown>[];
}

async function main(): Promise<void> {
  const bySource = await rows(`${BASE}
    select source, count(*) as groups, sum(n) as rows,
      count(*) filter (where mains > 1) as main_conflicts,
      count(*) filter (where titles = 1) as same_title,
      sum(kids) as kids
    from shape group by 1 order by 2 desc`);

  console.log("\n== 접을 후보 (제품군 축 제외)");
  let groups = 0;
  for (const r of bySource) {
    if (FAMILY_ID_SOURCES.includes(r.source as (typeof FAMILY_ID_SOURCES)[number])) continue;
    groups += Number(r.groups);
    console.log(
      `  ${r.source}: ${r.groups}묶음 (${r.rows}행) | 본편 충돌 ${r.main_conflicts} | 제목까지 같음 ${r.same_title} | 자식 ${r.kids}`,
    );
  }
  console.log(`  합계 ${groups}묶음`);

  console.log("\n== 제품군 축 (스토어 구조. 접는 대상이 아니다)");
  for (const r of bySource) {
    if (!FAMILY_ID_SOURCES.includes(r.source as (typeof FAMILY_ID_SOURCES)[number])) continue;
    console.log(
      `  ${r.source}: ${r.groups}묶음 (${r.rows}행) | 그중 제목까지 같아 접을 것 ${r.same_title} | 자식 ${r.kids}`,
    );
  }

  const kinds = await rows(`select content_type, count(*) from games group by 1 order by 2 desc`);
  console.log("\n== 카탈로그");
  for (const r of kinds) console.log(`  ${r.content_type}: ${r.count}`);
  process.exit(0);
}

void main();
