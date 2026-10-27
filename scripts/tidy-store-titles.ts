// 이미 들어앉은 제목의 상품 표기(™®, "PS4 & PS5", "(영어판/일어판)")와 중국어, 일본어 소개글을 걷는다.
//   tsx scripts/tidy-store-titles.ts            (셈만)
//   tsx scripts/tidy-store-titles.ts --apply    (반영)
//
// 판정은 수집과 같은 lib/store-text 를 쓴다 — 대본과 크롤의 문장이 다르면 다음 수집이 되돌린다.
// 수집은 이제 들어오는 값을 거르지만, 채우기만 하는 소스(META_OVERWRITE_SOURCES 밖)는 기존 값을 안 덮어서
// 이미 박힌 행은 이 대본이 아니면 영영 남는다.
// 관리자가 잠근 칸(data_corrections.lock_field)은 건드리지 않는다. 바꾸기 전 값은 백업 표에 남긴다. slug 는 그대로 둔다(주소).
import path from "node:path";
import { config as loadEnv } from "dotenv";
loadEnv({ path: path.resolve(process.cwd(), ".env.local"), quiet: true });
loadEnv({ quiet: true });

import { sql } from "drizzle-orm";
import { getDb } from "@/server/db/client";
import { cleanStoreTitle, usableDescription } from "@/lib/store-text";

const BACKUP = "store_title_tidy_20261027";

type Row = { id: string; title_en: string; title_ko: string | null; description: string | null; locked: string[] | null };

async function main(): Promise<number> {
  const apply = process.argv.includes("--apply");
  const db = getDb();

  const raw = await db.execute(sql`
    select g.id, g.title_en, g.title_ko, g.description,
      (select array_agg(c.field) from data_corrections c
        where c."table" = 'games' and c.row_id = g.id::text and c.lock_field) as locked
    from games g
    -- 백슬래시는 Neon 드라이버가 먹는다 — 닫는 괄호는 문자 집합으로 쓴다
    where g.title_en ~ '[™®©]|PS[45]|어판|어[)]' or g.title_ko ~ '[™®©]|PS[45]|어판|어[)]'
      or (g.description !~ '[가-힣]' and g.description ~ '[一-鿿぀-ヿ]')
  `);
  const rows = (raw.rows ?? raw) as Row[];
  const plans = rows
    .map((r) => {
      const lock = new Set(r.locked ?? []);
      const titleEn = lock.has("titleEn") ? r.title_en : cleanStoreTitle(r.title_en);
      const titleKo = lock.has("titleKo") ? r.title_ko : cleanStoreTitle(r.title_ko);
      const description = lock.has("description") ? r.description : (usableDescription(r.description) ?? null);
      return { r, titleEn, titleKo, description };
    })
    .filter((p) => p.titleEn !== p.r.title_en || p.titleKo !== p.r.title_ko || p.description !== p.r.description);

  const count = (pick: (p: (typeof plans)[number]) => boolean) => plans.filter(pick).length;
  console.log(`후보 ${rows.length}건 중 바꿀 행 ${plans.length}건`);
  console.log(`  영문 제목 ${count((p) => p.titleEn !== p.r.title_en)}, 한글 제목 ${count((p) => p.titleKo !== p.r.title_ko)}, 소개글 비움 ${count((p) => p.description !== p.r.description)}`);
  for (const p of plans.slice(0, 40)) {
    const before = p.r.title_ko ?? p.r.title_en;
    const after = p.titleKo ?? p.titleEn;
    console.log(`  ${before}  =>  ${after}${p.description !== p.r.description ? "  (소개글 비움)" : ""}`);
  }
  if (plans.length === 0 || !apply) {
    if (plans.length) console.log("\n--apply 를 주면 반영합니다.");
    return 0;
  }

  await db.execute(sql.raw(`create table if not exists ${BACKUP} (game_id uuid primary key, title_en text, title_ko text, description text, moved_at timestamptz default now())`));
  for (const p of plans) {
    await db.execute(sql`
      insert into ${sql.identifier(BACKUP)} (game_id, title_en, title_ko, description)
      values (${p.r.id}::uuid, ${p.r.title_en}, ${p.r.title_ko}, ${p.r.description})
      on conflict (game_id) do nothing
    `);
    await db.execute(sql`
      update games set title_en = ${p.titleEn}, title_ko = ${p.titleKo}, description = ${p.description}, updated_at = now()
      where id = ${p.r.id}::uuid
    `);
  }
  console.log(`\n${plans.length}건 고쳤습니다. 되돌리기 표: ${BACKUP}`);
  return 0;
}

main().then((c) => process.exit(c)).catch((e) => {
  console.error(`[tidy-titles] 예외: ${e instanceof Error ? (e.stack ?? e.message) : String(e)}`);
  process.exit(1);
});
