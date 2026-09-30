// 수집 현황 화면의 "무엇을 수집하고 있나" — 실행이 끝났다는 사실 말고, 그 실행이 무엇을 만졌는지.
//
// 왜 필요했나: 앞 화면은 소스마다 상태 배지와 처리 건수만 세웠다. 그 숫자는 "돌았다" 만 말하고
// **"제대로 돌았다"** 는 말하지 못한다 — 처리 200건이 전부 같은 실패를 반복한 200건일 수도 있고,
// 엉뚱한 카탈로그를 긁고 있을 수도 있다. 사람이 그걸 판단하려면 만진 물건의 이름을 봐야 한다.
//
// 2026-09-30 바꿈: 제목 셋으로는 "무엇을 가져왔나" 가 안 보였다(사용자: "가져온 게임 목록이랑 그 게임의
// 어떤 값들을 가져왔는지 보여주면 좋을듯"). 이제 소스마다 **마지막으로 기록을 남긴 실행**이 만진 게임과
// 바뀐 칸을 싣는다(sync_logs.items, 쓰는 쪽은 sync/touched). 제목 셋도 이 목록의 앞머리로 대신된다 —
// 일본 칸에 일본어 제목이 서는지, 며칠째 같은 실행에 머무는지는 시트의 제목과 시각이 그대로 말한다.
//
// 질의는 두 단이다. 소스별 마지막 실행의 items 를 먼저 집고, 거기 적힌 slug 로 제목을 한 번에 집는다.
// items 안의 slug 를 games 와 한 문장으로 조인하면 jsonb 를 풀어 헤친 뒤 조인해 계획이 무거워진다.
import "server-only";
import { and, between, desc, inArray, sql } from "drizzle-orm";
import { getDb } from "@/server/db/client";
import { requireAdmin } from "@/server/services/users";
import { gamePlatforms, games, type SourceName } from "@/server/db/schema";
import { STORE_SOURCES, type StoreSource } from "@/server/adapters";
import { SOURCE_PLATFORMS, SOURCE_REGION, SYNC_LOG_ITEMS_MAX } from "@/server/sync/constants";
import type { SyncLogItem } from "@/server/sync/touched";

/**
 * 끝나지 않은 실행을 "도는 중" 으로 볼 수 있는 시간. 이보다 오래면 끊긴 것으로 읽는다.
 * 60분인 이유: 가장 긴 실행(psstore 가격 한 바퀴)이 실측 약 8분이고, 서울 리전 크론이 몰릴 때
 * 대기까지 붙어도 그 몇 배 안에 끝난다. 실제로 wikidata_game 은 finished_at 이 없는 행을
 * 며칠째 남기고 있었는데(2026-09-21 실측), 그건 도는 중이 아니라 끊긴 것이다.
 */
export const RUNNING_GRACE_MINUTES = 60;

/** 시트 한 줄. 칸 이름은 컬럼 키 그대로다 — 사람 말로 옮기는 일은 화면이 한다(lib/admin/messages) */
export interface RunItem {
  slug: string;
  /** 게임이 지워졌거나 주소가 바뀌었으면 null. 화면은 slug 를 대신 띄운다 */
  title: string | null;
  fields: string[];
  created: boolean;
}

/** 소스 하나의 마지막 기록 실행 */
export interface RunItems {
  startedAt: Date;
  /** 그 실행이 처리한 수. items 는 상한(SYNC_LOG_ITEMS_MAX)에서 잘리므로 둘이 다를 수 있다 */
  processed: number;
  items: RunItem[];
  /**
   * sync_logs.items 가 없던 실행을 DB 흔적으로 되짚은 목록이다(traceRunItems). 가격과 새로 등록만 알고
   * 다른 칸이 바뀌었는지는 모른다 — 화면이 그 사실을 한 줄로 밝힌다.
   */
  traced?: boolean;
}

export interface SyncActivity {
  /** 소스별 마지막 기록 실행이 만진 게임 */
  lastRuns: Map<SourceName, RunItems>;
  /** 최근 24시간 동안 새로 등록된 게임 */
  newGames: number;
  /** 최근 24시간 동안 찍힌 가격 스냅샷 */
  priceSnapshots: number;
  /** 최근 24시간 동안 돈 실행 */
  runs: number;
  /**
   * 이 값을 읽은 시각. "도는 중" 과 "끊김" 을 가르는 데 쓴다.
   * 화면이 아니라 여기서 재는 이유: 서버 컴포넌트 안에서 Date.now() 를 부르면 렌더가 순수하지 않다
   * (react-hooks/purity). 시각은 자료와 함께 와야 자료와 같은 순간을 가리킨다.
   */
  asOf: number;
}

export async function getSyncActivity(): Promise<SyncActivity> {
  await requireAdmin();
  const db = getDb();

  type RunRow = { source: SourceName; started_at: string; processed: number | null; items: SyncLogItem[] };
  type TotalRow = { new_games: string; snapshots: string; runs: string };

  type WindowRow = { source: SourceName; started_at: string; finished_at: string; processed: number | null };

  const [runRes, totalRes, windowRes] = await Promise.all([
    db.execute(sql`
      select distinct on (source) source, started_at, processed, items
      from sync_logs
      where items is not null
      order by source, started_at desc
    `),
    db.execute(sql`
      select
        (select count(*) from games where created_at >= now() - interval '24 hours') as new_games,
        (select count(*) from price_snapshots where captured_at >= now() - interval '24 hours') as snapshots,
        (select count(*) from sync_logs where started_at >= now() - interval '24 hours') as runs
    `),
    // 스토어 소스의 마지막으로 끝난(무언가 처리한) 실행 창. items 가 아직 없는 소스를 되짚는 데 쓴다
    db.execute(sql`
      select distinct on (source) source, started_at, finished_at, processed
      from sync_logs
      where finished_at is not null and processed > 0
        and source in (${sql.join(STORE_SOURCES.map((s) => sql`${s}`), sql`, `)})
      order by source, started_at desc
    `),
  ]);

  const runRows = runRes.rows as RunRow[];
  const slugs = [...new Set(runRows.flatMap((r) => r.items.map((it) => it.slug)))];
  const titleRows =
    slugs.length === 0
      ? []
      : await db
          .select({ slug: games.slug, title: sql<string>`coalesce(${games.titleKo}, ${games.titleEn})` })
          .from(games)
          .where(inArray(games.slug, slugs));
  const titleBySlug = new Map(titleRows.map((r) => [r.slug, r.title]));

  const totals = (totalRes.rows as TotalRow[])[0];
  const lastRuns = new Map<SourceName, RunItems>();
  for (const row of runRows) {
    lastRuns.set(row.source, {
      startedAt: new Date(row.started_at),
      processed: row.processed ?? 0,
      items: row.items.map((it) => ({
        slug: it.slug,
        title: titleBySlug.get(it.slug) ?? null,
        fields: it.fields,
        created: it.created === true,
      })),
    });
  }

  // 기록이 아직 없는 스토어 소스는 마지막 실행 창을 DB 흔적으로 되짚는다
  const traced = await Promise.all(
    (windowRes.rows as WindowRow[])
      .filter((w) => !lastRuns.has(w.source))
      .map(async (w) => [w.source, await traceRunItems(w.source as StoreSource, w)] as const),
  );
  for (const [source, run] of traced) if (run.items.length > 0) lastRuns.set(source, run);

  return {
    lastRuns,
    asOf: Date.now(),
    newGames: Number(totals?.new_games ?? 0),
    priceSnapshots: Number(totals?.snapshots ?? 0),
    runs: Number(totals?.runs ?? 0),
  };
}

/**
 * sync_logs.items 를 남기기 전(2026-09-30 배포 전) 실행을 DB 흔적으로 되짚는다.
 *
 * 왜 두나: items 는 새 코드로 수집이 한 번 돌아야 생긴다. 그 전까지 시트가 비어 있으면 화면이 "버튼이 없다" 로
 * 끝난다(사용자가 바로 그걸 물었다). 스토어 소스는 흔적이 셋 남는다 — 그 실행 창 안에 갱신된 스토어 행
 * (game_platforms.last_synced_at), 그 창에 찍힌 가격 기록, 그 창에 만들어진 게임. 셋이면 "무엇을 가져왔나" 의
 * 뼈대는 선다. 다른 칸(이미지, 출시일)이 바뀌었는지는 흔적이 없어 모른다.
 *
 * 마지막 실행 창만 정확하다 — last_synced_at 은 다음 실행이 덮어쓰니 옛 실행은 되짚을 수 없다. 그래서 마지막만 본다.
 * 비용: last_synced_at 에 인덱스가 없어 game_platforms 를 훑는다(2026-09-30 실측 여섯 소스 합 0.85초).
 * items 가 쌓이면 이 경로는 저절로 안 탄다 — 인덱스를 새로 들이지 않는 이유다.
 */
async function traceRunItems(
  source: StoreSource,
  w: { started_at: string; finished_at: string; processed: number | null },
): Promise<RunItems> {
  const db = getDb();
  const start = new Date(w.started_at);
  const end = new Date(w.finished_at);
  const created = sql<boolean>`${games.createdAt} >= ${start.toISOString()}::timestamptz`;
  const priced = sql<boolean>`exists (
    select 1 from price_snapshots ps
    where ps.game_platform_id = ${gamePlatforms.id}
      and ps.captured_at between ${start.toISOString()}::timestamptz and ${end.toISOString()}::timestamptz
  )`;
  const rows = await db
    .select({ slug: games.slug, title: sql<string>`coalesce(${games.titleKo}, ${games.titleEn})`, created, priced })
    .from(gamePlatforms)
    .innerJoin(games, sql`${games.id} = ${gamePlatforms.gameId}`)
    .where(
      and(
        inArray(gamePlatforms.platform, SOURCE_PLATFORMS[source]),
        sql`${gamePlatforms.region} = ${SOURCE_REGION[source]}`,
        between(gamePlatforms.lastSyncedAt, start, end),
      ),
    )
    // items 와 같은 순서 — 새로 등록, 가격 바뀜, 그대로
    .orderBy(desc(created), desc(priced))
    .limit(SYNC_LOG_ITEMS_MAX);

  const seen = new Set<string>();
  const items: RunItem[] = [];
  for (const r of rows) {
    // 한 게임이 기기 둘(ps5, ps4)로 두 줄 나올 수 있다
    if (seen.has(r.slug)) continue;
    seen.add(r.slug);
    items.push({ slug: r.slug, title: r.title, fields: r.priced ? ["currentPrice"] : [], created: r.created });
  }
  return { startedAt: start, processed: w.processed ?? 0, items, traced: true };
}
