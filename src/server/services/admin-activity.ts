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
import { inArray, sql } from "drizzle-orm";
import { getDb } from "@/server/db/client";
import { requireAdmin } from "@/server/services/users";
import { games, type SourceName } from "@/server/db/schema";
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

  const [runRes, totalRes] = await Promise.all([
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

  return {
    lastRuns,
    asOf: Date.now(),
    newGames: Number(totals?.new_games ?? 0),
    priceSnapshots: Number(totals?.snapshots ?? 0),
    runs: Number(totals?.runs ?? 0),
  };
}
