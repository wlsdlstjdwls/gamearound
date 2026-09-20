// 이미 본편으로 앉아 있는 재화, 교환권 상품을 dlc 로 내린다.
//   tsx scripts/reclass-currency.ts            (셈만)
//   tsx scripts/reclass-currency.ts --apply    (반영)
//
// 판정은 lib/games/content-kind 의 isCurrencyItemTitle 하나만 쓴다 — 수집이 쓰는 문장과 같아야
// "대본은 내렸는데 다음 크롤이 되살린다" 가 안 생긴다. 그래서 여기서 SQL 정규식을 다시 적지 않고,
// 후보를 넓게 끌어와 **TypeScript 쪽 함수로** 거른다(행 수가 수만이 아니라 감당된다).
//
// 지우지 않는다. content_type 만 바꾸고 원래 값을 백업 표에 남긴다.
import path from "node:path";
import { config as loadEnv } from "dotenv";
loadEnv({ path: path.resolve(process.cwd(), ".env.local"), quiet: true });
loadEnv({ quiet: true });

import { sql } from "drizzle-orm";
import { getDb } from "@/server/db/client";
import { isCurrencyItemTitle } from "@/lib/games/content-kind";

const BACKUP = "currency_reclass_20260921";

async function main(): Promise<number> {
  const apply = process.argv.includes("--apply");
  const db = getDb();

  // 재화 낱말이 하나라도 든 본편을 넓게 끌어온다. 정밀한 판정은 아래 필터가 한다
  const raw = await db.execute(sql`
    select id, coalesce(title_ko, title_en) as t, title_ko, title_en
    from games
    where content_type = 'game' and visibility = 'public'
      and coalesce(title_ko, title_en) ~* '[0-9]'
  `);
  const rows = (raw.rows ?? raw) as Array<{ id: string; t: string; title_ko: string | null; title_en: string | null }>;
  const hits = rows.filter((r) => isCurrencyItemTitle(r.title_ko) || isCurrencyItemTitle(r.title_en) || isCurrencyItemTitle(r.t));

  console.log(`숫자 든 본편 ${rows.length}건을 훑어 재화 ${hits.length}건:`);
  for (const h of hits) console.log(`  ${h.t}`);
  if (hits.length === 0) return 0;

  if (!apply) {
    console.log("\n--apply 를 주면 반영합니다.");
    return 0;
  }

  const ids = hits.map((h) => h.id);
  await db.execute(sql.raw(`create table if not exists ${BACKUP} (game_id uuid primary key, old_content_type text, moved_at timestamptz default now())`));
  await db.execute(sql`
    insert into ${sql.identifier(BACKUP)} (game_id, old_content_type)
    select id, content_type::text from games where id in ${sql`(${sql.join(ids.map((i) => sql`${i}::uuid`), sql`, `)})`}
    on conflict (game_id) do nothing
  `);
  const res = await db.execute(sql`
    update games set content_type = 'dlc', updated_at = now()
    where id in ${sql`(${sql.join(ids.map((i) => sql`${i}::uuid`), sql`, `)})`}
  `);
  console.log(`\n${(res as { rowCount?: number }).rowCount ?? 0}건 내렸습니다. 되돌리기 표: ${BACKUP}`);
  return 0;
}

main().then((c) => process.exit(c)).catch((e) => {
  console.error(`[reclass] 예외: ${e instanceof Error ? (e.stack ?? e.message) : String(e)}`);
  process.exit(1);
});
