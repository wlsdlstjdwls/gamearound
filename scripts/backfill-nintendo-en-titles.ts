// 한국 닌텐도에서만 들어온 게임의 title_en 에 들어앉은 한글을 영문 이름으로 바꾼다. 근거는 sync/nintendo-en-title 머리.
//   tsx scripts/backfill-nintendo-en-titles.ts                 (셈만)
//   tsx scripts/backfill-nintendo-en-titles.ts --apply         (반영)
//   --dir=<폴더>  타이틀 DB 파일을 내려받지 않고 그 폴더에서 읽는다
//
// 바꾼 게임은 메타 소스(HLTB, 메타크리틱, 오픈크리틱, 위키데이터)의 "후보 없음(none)" 기록을 지운다 —
// 그 기록은 한글로 찾다 빈손이었던 결과라, 남겨 두면 14일(NONE_RETRY_DAYS) 동안 영문으로 다시 찾지 않는다.
// slug 는 그대로 둔다(주소). 관리자가 잠근 칸은 건드리지 않는다. 바꾸기 전 값은 백업 표에 남긴다.
// 닌텐도 수집은 제목을 채우기만 하므로(META_OVERWRITE_SOURCES 밖) 다음 수집이 되돌리지 않는다.
import path from "node:path";
import { readFile } from "node:fs/promises";
import { config as loadEnv } from "dotenv";
loadEnv({ path: path.resolve(process.cwd(), ".env.local"), quiet: true });
loadEnv({ quiet: true });

import { sql } from "drizzle-orm";
import { getDb } from "@/server/db/client";
import { pickEnglishTitle } from "@/server/sync/nintendo-en-title";
import { TITLEDB_BASE_URL, TITLEDB_EN_FILES, TITLEDB_KR_FILE } from "@/server/adapters/nintendo/constants";

const BACKUP = "nintendo_en_title_20261110";
/** 영문 이름을 얻은 뒤 다시 찾게 할 메타 소스 */
const REQUEUE_SOURCES = ["hltb", "metacritic", "opencritic", "wikidata_game"];
/** 한 번에 보내는 행 수. 한 문장으로 쓰되 요청 본문이 너무 커지지 않게 */
const WRITE_CHUNK = 500;

type TitleDbEntry = { id?: string | null; nsuId?: number | string | null; name?: string | null };
type Row = { id: string; title_en: string; norm: string; nsuid: string };

async function loadTitleDb(file: string, dir: string | undefined): Promise<Record<string, TitleDbEntry>> {
  if (dir) return JSON.parse(await readFile(path.join(dir, file), "utf8"));
  const res = await fetch(`${TITLEDB_BASE_URL}/${file}`);
  if (!res.ok) throw new Error(`타이틀 DB ${file} ${res.status}`);
  return res.json();
}

async function main(): Promise<number> {
  const apply = process.argv.includes("--apply");
  const dir = process.argv.find((a) => a.startsWith("--dir="))?.slice("--dir=".length);
  const db = getDb();

  const raw = await db.execute(sql`
    select distinct on (g.id) g.id, g.title_en, g.title_en_norm as norm, r.external_id as nsuid
    from games g
    join game_source_refs r on r.game_id = g.id and r.source = 'nintendo' and r.matched_by in ('auto', 'manual')
    where g.title_en ~ '[가-힣]'
      and not exists (select 1 from data_corrections c
        where c."table" = 'games' and c.row_id = g.id::text and c.field in ('titleEn', 'title_en') and c.lock_field)
  `);
  const rows = (raw.rows ?? raw) as Row[];
  console.log(`한글 영문 칸 ${rows.length}건`);

  // 한국 nsuid → 타이틀 ID
  const kr = await loadTitleDb(TITLEDB_KR_FILE, dir);
  const titleIdByNsuid = new Map<string, string>();
  for (const e of Object.values(kr)) if (e.nsuId && e.id) titleIdByNsuid.set(String(e.nsuId), e.id.toUpperCase());
  // 타이틀 ID → 영문 이름. 앞 파일이 이긴다
  const enByTitleId = new Map<string, string>();
  for (const file of TITLEDB_EN_FILES) {
    for (const e of Object.values(await loadTitleDb(file, dir))) {
      const id = e.id?.toUpperCase();
      if (id && e.name && !enByTitleId.has(id)) enByTitleId.set(id, e.name);
    }
  }

  // 세 번째 출처(2026-11-10): 같은 한국어 제목을 가진 다른 게임(PS, 스팀 등)의 영문 제목. 아시아판 전용 타이틀 ID 는
  // 미국, 영국에 없어 타이틀 DB 로는 못 찾는데(남은 339건 중 266건), 같은 게임이 다른 스토어에서 한국어, 영문 제목을 둘 다 갖고 있는 경우가 있다.
  // 정규화한 한국어 제목이 정확히 같을 때만 빌린다(실측 24건 전부 맞았다 — "귀멸의 칼날: 도전, 최강의 대원!" -> "Demon Slayer -Kimetsu no Yaiba- Sweep the Board!")
  const norms = [...new Set(rows.map((r) => r.norm).filter(Boolean))];
  const borrowedRaw = norms.length
    ? await db.execute(sql`
        select distinct on (o.title_ko_norm) o.title_ko_norm as norm, o.title_en
        from games o
        where o.title_ko_norm in (select jsonb_array_elements_text(${JSON.stringify(norms)}::jsonb)) and o.title_en !~ '[가-힣]'
        order by o.title_ko_norm, o.created_at
      `)
    : { rows: [] };
  const borrowed = new Map(((borrowedRaw.rows ?? borrowedRaw) as Array<{ norm: string; title_en: string }>).map((b) => [b.norm, b.title_en]));

  const plans = rows
    .map((r) => {
      const titleId = titleIdByNsuid.get(r.nsuid);
      const next = pickEnglishTitle(r.title_en, (titleId ? enByTitleId.get(titleId) : null) ?? borrowed.get(r.norm));
      return { r, next };
    })
    .filter((p): p is { r: Row; next: string } => p.next !== null);

  console.log(`영문 이름을 찾은 행 ${plans.length}건`);
  for (const p of plans.slice(0, 30)) console.log(`  ${p.r.title_en}  =>  ${p.next}`);
  if (plans.length === 0 || !apply) {
    if (plans.length) console.log("\n--apply 를 주면 반영합니다.");
    return 0;
  }

  await db.execute(sql.raw(`create table if not exists ${BACKUP} (game_id uuid primary key, title_en text, moved_at timestamptz default now())`));
  for (let i = 0; i < plans.length; i += WRITE_CHUNK) {
    const chunk = plans.slice(i, i + WRITE_CHUNK).map((p) => ({ id: p.r.id, before: p.r.title_en, after: p.next }));
    const json = JSON.stringify(chunk);
    await db.execute(sql`
      insert into ${sql.identifier(BACKUP)} (game_id, title_en)
      select v.id, v.before from jsonb_to_recordset(${json}::jsonb) v(id uuid, before text)
      on conflict (game_id) do nothing
    `);
    await db.execute(sql`
      update games g set title_en = v.after, updated_source = 'system', updated_by = null, updated_at = now()
      from jsonb_to_recordset(${json}::jsonb) v(id uuid, after text)
      where g.id = v.id and g.title_en ~ '[가-힣]'
    `);
    await db.execute(sql`
      delete from game_source_refs r
      using jsonb_to_recordset(${json}::jsonb) v(id uuid)
      where r.game_id = v.id and r.matched_by = 'none'
        and r.source::text in (select jsonb_array_elements_text(${JSON.stringify(REQUEUE_SOURCES)}::jsonb))
    `);
  }
  console.log(`\n${plans.length}건 고쳤습니다. 되돌리기 표: ${BACKUP}`);
  return 0;
}

main().then((c) => process.exit(c)).catch((e) => {
  console.error(`[nintendo-en-titles] 예외: ${e instanceof Error ? (e.stack ?? e.message) : String(e)}`);
  process.exit(1);
});
