// 한 스토어 ID 를 여러 게임 행이 나눠 가진 묶음을 하나로 접는다.
//
//   pnpm dedup:stores [--source xbox] [--limit 20] [--external Q73154387] [--apply]
//
// **왜 지우지 않고 옮기나.** 2026-09-18 실측으로 접을 수 있는 xbox 86묶음 전부가 가격 이력을
// 두 행 이상에 나눠 갖고 있었고, 그 행들 밑에 자식 DLC 83건이 달려 있었다. `games.parent_game_id`
// 가 cascade 라 부모를 지우면 자식이 소리 없이 따라 죽는다. 그래서 지우기 전에 가진 것을 전부
// 살아남는 행으로 옮기고, 마지막에 껍데기만 지운다.
//
// **한 묶음만 접고 싶을 때** `--external` 에 그 스토어 ID 를 준다. 이 도구는 한 번에 수십 묶음을
// 지우므로, 고친 규칙이 새로 잡아낸 묶음 하나만 확인하고 접는 길이 있어야 한다.
//
// **무엇만 접나.** 기종 꼬리표(`(Xbox One)`, `— Windows`)만 다르고 나머지 이름이 같은 **본편** 묶음만.
// 리마스터, 확장판, 에디션은 별개 상품이라 손대지 않는다(2026-09-15 2차 중복 정리에서 정한 선).
// 판단이 갈리는 묶음은 건드리지 않는다 — 사람이 볼 몫이다.
//
// **사람이 판정한 한 쌍을 접을 때** `--pair <지울 slug>:<남길 slug>` 를 준다(여러 번 줄 수 있다).
// 위의 "무엇만 접나" 조건을 건너뛴다 — 에디션 이름이 달라도 같은 스토어 상품을 두 행이 나눠 가진 경우,
// psprices 껍데기가 한글 주소로 따로 앉은 경우처럼 규칙으로는 못 잡지만 사람이 본 묶음이 있다
// (2026-09-23 PS 순위 판정표). 옮기는 길은 규칙 묶음과 같다 — 그 부분을 다시 짜지 않으려고 여기에 붙였다.
//
// 되돌리기: `--apply` 는 지우기 전에 백업 표 셋(`dupmerge_games_*`, `dupmerge_platforms_*`,
// `dupmerge_map_*`)에 원본을 넣는다. 표 이름의 날짜가 회차다.
import path from "node:path";
import { config as loadEnv } from "dotenv";
loadEnv({ path: path.resolve(process.cwd(), ".env.local"), quiet: true });

import { sql } from "drizzle-orm";
import { getDb } from "@/server/db/client";

/** 기종 꼬리표. 괄호형과 줄표형 둘 다 온다(실측: "Axonvolt (Xbox One)", "Grizzly Bear Is Hungry — Windows") */
const DEVICE = "(windows|pc|xbox one|xbox series x/s|xbox series x[|]s|ps4|ps5)";
/**
 * 구분자 없이 이름 끝에 그냥 붙는 꼬리표에만 쓰는 좁은 사전(실측 2026-09-18, wikidata 묶음):
 * "STAR WARS Jedi: Survivor™ Xbox One", "NBA 2K26 for Xbox Series X|S", "Mafia: Definitive Edition for XBOX One".
 * 여기에 windows, pc 를 넣지 않는다 — 구분자가 없으면 "Broken Windows" 같은 진짜 제목의 끝말을 떼어 낸다.
 */
const DEVICE_BARE = "(xbox one|xbox series x/s|xbox series x[|]s|ps4|ps5)";
/** "Xbox One & Xbox Series X|S", "PS4 & PS5" 처럼 둘을 묶어 적는 꼴도 한 꼬리표다 */
const PAIR = (d: string) => `${d}([[:space:]]*(&|and)[[:space:]]*${d})?`;
/**
 * "기본판" 꼬리 — 본편 그 자체를 가리키는 말만 넣는다.
 *
 * 왜 여기에만 에디션을 들이나(2026-09-21): 위 머리글대로 리마스터, 확장판, 디럭스는 값도 내용도
 * 다른 별개 상품이라 접지 않는다. 그런데 "일반판" 은 **본편을 부르는 다른 이름**이다 —
 * 접을 것이 없다고 두면 같은 게임이 두 행으로 남는다. 실제로 "디아블로 IV — 일반판"(Xbox)이
 * 본편과 따로 앉아 홈 할인 줄 2, 3번을 같은 게임이 나란히 차지했다.
 *
 * 얼티밋, 디럭스, 컬렉션은 일부러 없다. 그것들은 사람이 볼 몫으로 남긴다.
 */
const BASE_EDITION = "(standard[[:space:]]+edition|일반판|통상판|제품판)";
// 백슬래시를 안 쓴다 — Neon 드라이버가 생 SQL 의 백슬래시를 먹어 정규식이 조용히 빗나간다
const TAIL = [
  `[(][[:space:]]*(for[[:space:]]+)?${PAIR(DEVICE)}[[:space:]]*[)]`,
  `[—–-][[:space:]]*(for[[:space:]]+)?${PAIR(DEVICE)}`,
  `[[:space:]](for[[:space:]]+)?${PAIR(DEVICE_BARE)}`,
  `[—–:-]?[[:space:]]*${BASE_EDITION}`,
].join("|");
const STRIP = (col: string) =>
  `regexp_replace(${col}, '[[:space:]]*(${TAIL})[[:space:]]*$', '', 'i')`;
const NORM = (col: string) => `lower(regexp_replace(${STRIP(col)}, '[^[:alnum:]]+', '', 'g'))`;
/** 주소에 남은 같은 꼬리표. 제목과 달리 이미 소문자, 붙임표 꼴이라 따로 적는다 */
const SLUG_STRIP = (col: string) =>
  `regexp_replace(${col}, '-((for-)?(windows|pc|xbox-one|xbox-series-x-s|ps4|ps5)(-(and|&)?-?(xbox-one|xbox-series-x-s|ps4|ps5))?|standard-edition|일반판|통상판|제품판)$', '')`;

/** 합칠 때 살아남는 행의 빈 칸만 메우는 칸들. 값이 있는 칸은 건드리지 않는다(AGENTS §7) */
const FILLABLE = [
  "title_ko", "description", "cover_url", "portrait_url", "developer", "publisher",
  "local_max_players", "online_max_players",
] as const;
/** 플랫폼 행을 합칠 때도 같은 규칙이다 — 빈 칸만 메운다 */
const FILLABLE_PLATFORM = [
  "store_external_id", "store_url", "release_date", "current_version", "list_price", "current_price",
  "discount_pct", "discount_starts_at", "discount_ends_at", "discount_name",
  "metacritic_score", "opencritic_score",
] as const;

const STAMP = new Date().toISOString().slice(0, 10).replace(/-/g, "");
const ACTOR = "system";

interface Member {
  id: string;
  titleEn: string;
  baseTitle: string;
  snapshots: number;
  platforms: number;
  kids: number;
  createdAt: string;
}
interface Group {
  externalId: string;
  members: Member[];
}

function arg(name: string): string | null {
  const i = process.argv.indexOf(name);
  return i >= 0 ? (process.argv[i + 1] ?? null) : null;
}

/** 접을 수 있는 묶음만 가져온다 — 꼬리표를 뗀 이름이 하나로 모이고 전부 본편인 것 */
async function loadGroups(source: string, limit: number, externalId: string | null): Promise<Group[]> {
  // 외부 ID 는 스토어가 주는 값이라 따옴표가 섞일 수 있다 — 리터럴로 잇기 전에 막는다
  const only = externalId ? `and g.external_id = '${externalId.replace(/'/g, "''")}'` : "";
  const rows = await getDb().execute(sql.raw(`
    with refs as (
      select game_id, external_id from game_source_refs
      where matched_by <> 'none' and source = '${source}'
    ), grp as (
      select external_id, array_agg(game_id) as ids from refs group by 1 having count(*) > 1
    ), foldable as (
      select g.external_id, g.ids from grp g
      where true ${only}
        and (select count(distinct ${NORM("x.title_en")}) from games x where x.id = any(g.ids)) = 1
        and (select bool_and(x.content_type = 'game') from games x where x.id = any(g.ids))
    )
    select f.external_id, x.id, x.title_en, ${STRIP("x.title_en")} as base_title, x.created_at,
      (select count(*) from game_platforms gp where gp.game_id = x.id) as platforms,
      (select count(*) from game_platforms gp join price_snapshots ps on ps.game_platform_id = gp.id
       where gp.game_id = x.id) as snapshots,
      (select count(*) from games c where c.parent_game_id = x.id) as kids
    from foldable f join games x on x.id = any(f.ids)
    order by f.external_id
  `));

  const byId = new Map<string, Group>();
  for (const r of rows.rows as Record<string, string>[]) {
    const g = byId.get(r.external_id) ?? { externalId: r.external_id, members: [] };
    g.members.push({
      id: r.id,
      titleEn: r.title_en,
      baseTitle: r.base_title,
      snapshots: Number(r.snapshots),
      platforms: Number(r.platforms),
      kids: Number(r.kids),
      createdAt: String(r.created_at),
    });
    byId.set(r.external_id, g);
  }
  return [...byId.values()].slice(0, limit);
}

/**
 * 살아남을 행. 꼬리표가 없는 이름을 이미 가진 행이 있으면 그 행이다 — 주소(slug)가 가장 그럴듯하다.
 * 없으면 가진 것이 가장 많은 행을 남긴다. 옮기는 양이 줄면 사고 날 자리도 준다.
 */
function pickSurvivor(members: Member[]): Member {
  const clean = members.filter((m) => m.titleEn === m.baseTitle);
  const pool = clean.length > 0 ? clean : members;
  return [...pool].sort(
    (a, b) =>
      b.snapshots - a.snapshots || b.platforms - a.platforms || b.kids - a.kids || a.createdAt.localeCompare(b.createdAt),
  )[0];
}

/** 충돌하면 옮기지 않는다 — 남은 행은 껍데기와 함께 cascade 로 사라진다 */
async function moveRows(table: string, keys: string[], loser: string, survivor: string): Promise<void> {
  const cond = keys.map((k) => `t2.${k} = t.${k}`).join(" and ");
  const guard = keys.length
    ? `and not exists (select 1 from ${table} t2 where t2.game_id = '${survivor}' and ${cond})`
    : "";
  await getDb().execute(sql.raw(
    `update ${table} t set game_id = '${survivor}' where t.game_id = '${loser}' ${guard}`,
  ));
}

/** 플랫폼 행 합치기. 같은 (플랫폼, 지역) 행이 이미 있으면 이력만 옮기고 껍데기를 지운다 */
async function mergePlatforms(loser: string, survivor: string): Promise<void> {
  const db = getDb();
  const rows = await db.execute(sql.raw(`
    select l.id as loser_id, s.id as survivor_id from game_platforms l
    left join game_platforms s on s.game_id = '${survivor}' and s.platform = l.platform and s.region = l.region
    where l.game_id = '${loser}'`));

  for (const r of rows.rows as Record<string, string | null>[]) {
    const lp = r.loser_id as string;
    const sp = r.survivor_id;
    if (!sp) {
      await db.execute(sql.raw(`update game_platforms set game_id = '${survivor}' where id = '${lp}'`));
      continue;
    }
    await db.execute(sql.raw(`update price_snapshots set game_platform_id = '${sp}' where game_platform_id = '${lp}'`));
    await db.execute(sql.raw(`
      update patch_notes t set game_platform_id = '${sp}' where t.game_platform_id = '${lp}'
        and not exists (select 1 from patch_notes t2 where t2.game_platform_id = '${sp}' and t2.external_id = t.external_id)`));
    await db.execute(sql.raw(`
      update game_subscriptions t set game_platform_id = '${sp}' where t.game_platform_id = '${lp}'
        and not exists (select 1 from game_subscriptions t2 where t2.game_platform_id = '${sp}' and t2.subscription_id = t.subscription_id)`));
    const fill = FILLABLE_PLATFORM.map((c) => `${c} = coalesce(s.${c}, l.${c})`).join(", ");
    await db.execute(sql.raw(`
      update game_platforms s set ${fill}, updated_source = '${ACTOR}', updated_at = now()
      from game_platforms l where s.id = '${sp}' and l.id = '${lp}'`));
    await db.execute(sql.raw(`delete from game_platforms where id = '${lp}'`));
  }
}

async function backup(losers: string[], survivorOf: Map<string, string>, externalOf: Map<string, string>): Promise<void> {
  const db = getDb();
  const list = losers.map((id) => `'${id}'`).join(",");
  await db.execute(sql.raw(`create table if not exists dupmerge_games_${STAMP} as select * from games where false`));
  await db.execute(sql.raw(`create table if not exists dupmerge_platforms_${STAMP} as select * from game_platforms where false`));
  await db.execute(sql.raw(
    `create table if not exists dupmerge_map_${STAMP} (loser_id uuid, survivor_id uuid, external_id text, merged_at timestamptz default now())`,
  ));
  await db.execute(sql.raw(`insert into dupmerge_games_${STAMP} select * from games where id in (${list})`));
  await db.execute(sql.raw(`insert into dupmerge_platforms_${STAMP} select * from game_platforms where game_id in (${list})`));
  const values = losers.map((id) => `('${id}', '${survivorOf.get(id)}', '${externalOf.get(id)}')`).join(",");
  await db.execute(sql.raw(`insert into dupmerge_map_${STAMP} (loser_id, survivor_id, external_id) values ${values}`));
}

async function mergeGroup(group: Group, survivor: Member): Promise<void> {
  const db = getDb();
  for (const loser of group.members) {
    if (loser.id === survivor.id) continue;
    // 자식을 먼저 옮긴다. 이 한 줄을 빠뜨리면 마지막 delete 가 자식 DLC 를 데리고 간다
    await db.execute(sql.raw(
      `update games set parent_game_id = '${survivor.id}', updated_source = '${ACTOR}', updated_at = now()
       where parent_game_id = '${loser.id}'`,
    ));
    await mergePlatforms(loser.id, survivor.id);
    await moveRows("game_source_refs", ["source"], loser.id, survivor.id);
    await moveRows("game_aliases", ["alias_norm"], loser.id, survivor.id);
    await moveRows("game_genres", ["genre_id"], loser.id, survivor.id);
    await moveRows("game_companies", ["company_id", "role"], loser.id, survivor.id);
    await moveRows("game_requirements", ["platform", "os_family", "tier"], loser.id, survivor.id);
    await moveRows("game_requirement_floors", ["os_family"], loser.id, survivor.id);
    await moveRows("upgrades", ["from_platform", "to_platform"], loser.id, survivor.id);
    await moveRows("wishlists", ["user_id"], loser.id, survivor.id);
    await moveRows("price_alerts", ["user_id"], loser.id, survivor.id);
    await moveRows("news", [], loser.id, survivor.id);
    await moveRows("discovery_ignores", [], loser.id, survivor.id);
    await moveRows("products", [], loser.id, survivor.id);
    await moveRows("product_components", [], loser.id, survivor.id);
    await db.execute(sql.raw(`
      update playtimes t set game_id = '${survivor.id}' where t.game_id = '${loser.id}'
        and not exists (select 1 from playtimes t2 where t2.game_id = '${survivor.id}')`));
    // 껍데기가 갖고 있던 값 중 살아남는 행이 비워 둔 칸만 메운다
    const fill = FILLABLE.map((c) => `${c} = coalesce(s.${c}, l.${c})`).join(", ");
    await db.execute(sql.raw(`
      update games s set ${fill}, updated_source = '${ACTOR}', updated_at = now()
      from games l where s.id = '${survivor.id}' and l.id = '${loser.id}'`));
    await db.execute(sql.raw(`delete from games where id = '${loser.id}'`));
  }
  // 살아남은 행의 이름에서 기종 꼬리표를 뗀다 — 접고 나면 그 꼬리표가 가리키는 것이 없다
  await db.execute(sql.raw(`
    update games set title_en = ${STRIP("title_en")}, updated_source = '${ACTOR}', updated_at = now()
    where id = '${survivor.id}' and title_en <> ${STRIP("title_en")}`));
  // 주소도 같이 뗀다. `/games/frog-hero-dx-windows` 에 사는 "Frog Hero DX" 는 접은 자국이 남은 것이다.
  // 이미 그 주소를 쓰는 게임이 있으면 그대로 둔다 — 남의 주소를 뺏느니 자국이 낫다
  await db.execute(sql.raw(`
    update games s set slug = ${SLUG_STRIP("s.slug")}, updated_source = '${ACTOR}', updated_at = now()
    where s.id = '${survivor.id}' and s.slug <> ${SLUG_STRIP("s.slug")}
      and not exists (select 1 from games g2 where g2.slug = ${SLUG_STRIP("s.slug")})`));
}

/** `--pair` 로 받은 쌍을 묶음 꼴로 만든다. 남길 행을 맨 앞에 둔다 */
async function loadPairs(pairs: string[]): Promise<Group[]> {
  const groups: Group[] = [];
  for (const pair of pairs) {
    const [loserSlug, survivorSlug] = pair.split(":");
    if (!loserSlug || !survivorSlug) throw new Error(`--pair 는 <지울 slug>:<남길 slug> 꼴이다: ${pair}`);
    const members: Member[] = [];
    for (const slug of [survivorSlug, loserSlug]) {
      const rows = await getDb().execute(sql`
        select x.id, x.title_en, x.created_at,
          (select count(*) from game_platforms gp where gp.game_id = x.id) as platforms,
          (select count(*) from game_platforms gp join price_snapshots ps on ps.game_platform_id = gp.id
           where gp.game_id = x.id) as snapshots,
          (select count(*) from games c where c.parent_game_id = x.id) as kids
        from games x where x.slug = ${slug}`);
      const r = (rows.rows as Record<string, string>[])[0];
      if (!r) throw new Error(`없는 slug: ${slug}`);
      members.push({
        id: r.id, titleEn: r.title_en, baseTitle: r.title_en, snapshots: Number(r.snapshots),
        platforms: Number(r.platforms), kids: Number(r.kids), createdAt: String(r.created_at),
      });
    }
    groups.push({ externalId: `pair:${survivorSlug}`, members });
  }
  return groups;
}

function allArgs(name: string): string[] {
  return process.argv.flatMap((a, i) => (a === name && process.argv[i + 1] ? [process.argv[i + 1]] : []));
}

async function main(): Promise<void> {
  const source = arg("--source") ?? "xbox";
  const limit = Number(arg("--limit") ?? 1000);
  const externalId = arg("--external");
  const apply = process.argv.includes("--apply");
  const pairs = allArgs("--pair");
  const groups = pairs.length > 0 ? await loadPairs(pairs) : await loadGroups(source, limit, externalId);
  // 쌍은 사람이 남길 쪽을 정했다 — 규칙(꼬리표 없는 이름, 가진 것이 많은 행)으로 뒤집지 않는다
  const survivorFor = (g: Group) => (pairs.length > 0 ? g.members[0] : pickSurvivor(g.members));
  if (groups.length === 0) {
    console.log(`[dedup] ${source} 에 접을 묶음이 없다`);
    return;
  }

  const losers: string[] = [];
  const survivorOf = new Map<string, string>();
  const externalOf = new Map<string, string>();
  let kids = 0;
  let snapshots = 0;
  for (const g of groups) {
    const survivor = survivorFor(g);
    for (const m of g.members) {
      if (m.id === survivor.id) continue;
      losers.push(m.id);
      survivorOf.set(m.id, survivor.id);
      externalOf.set(m.id, g.externalId);
      kids += m.kids;
      snapshots += m.snapshots;
    }
  }
  console.log(`[dedup] ${source}: ${groups.length}묶음, 게임 ${groups.length + losers.length}행 에서 ${groups.length}행 으로`);
  console.log(`[dedup] 옮길 것: 자식 DLC ${kids}건, 껍데기에 달린 가격 이력 ${snapshots}건`);
  for (const g of groups.slice(0, 5)) {
    const s = survivorFor(g);
    const folded = g.members.filter((m) => m.id !== s.id).map((m) => m.titleEn).join(", ");
    console.log(`  ${g.externalId}  남길 것: ${s.titleEn}  | 접을 것: ${folded}`);
  }
  if (!apply) {
    console.log("[dedup] 미리보기다. 실제로 접으려면 --apply 를 붙인다");
    return;
  }

  await backup(losers, survivorOf, externalOf);
  console.log(`[dedup] 백업 표: dupmerge_games_${STAMP}, dupmerge_platforms_${STAMP}, dupmerge_map_${STAMP}`);
  let done = 0;
  for (const g of groups) {
    await mergeGroup(g, survivorFor(g));
    done++;
    if (done % 10 === 0) console.log(`[dedup] ${done}/${groups.length} 묶음`);
  }
  console.log(`[dedup] ${done}묶음을 접었다 (게임 ${losers.length}행 삭제)`);
}

void main();
