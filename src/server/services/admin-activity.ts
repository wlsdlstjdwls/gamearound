// 수집 현황 화면의 "무엇을 수집하고 있나" — 실행이 끝났다는 사실 말고, 그 실행이 무엇을 만졌는지.
//
// 왜 필요했나: 앞 화면은 소스마다 상태 배지와 처리 건수만 세웠다. 그 숫자는 "돌았다" 만 말하고
// **"제대로 돌았다"** 는 말하지 못한다 — 처리 200건이 전부 같은 실패를 반복한 200건일 수도 있고,
// 엉뚱한 카탈로그를 긁고 있을 수도 있다. 사람이 그걸 판단하려면 만진 물건의 이름을 봐야 한다.
//
// 그래서 소스마다 **마지막으로 만진 게임 제목 몇 개**를 같이 싣는다. 닌텐도 일본 칸에 일본어 제목이
// 서고 스팀 칸에 영문 제목이 서면 그 두 소스는 제 카탈로그를 보고 있다는 뜻이고, 한 칸이 며칠째
// 같은 제목에 머물러 있으면 그 소스는 큐 선두에서 막힌 것이다(hltb 큐 머리막힘이 그랬다).
//
// 질의는 두 단으로 나눠 쓴다. 한 문장으로 games 와 조인한 채 lateral 을 돌리면 플래너가 소스마다
// games 를 전수 훑는다(실측 198ms, 버퍼 59k). 먼저 ref 에서 소스별 최근 몇 줄만 집고(인덱스
// gsr_source_matched_checked_idx), 그 다음 게임을 PK 로 집으면 같은 결과가 10ms 다.
import "server-only";
import { sql } from "drizzle-orm";
import { getDb } from "@/server/db/client";
import { requireAdmin } from "@/server/services/users";
import type { SourceName } from "@/server/db/schema";

/** 소스 한 칸에 실을 최근 제목 수. 셋이면 "카탈로그가 어디쯤인가" 가 보이고 칸 높이는 안 무너진다 */
export const RECENT_TITLES_PER_SOURCE = 3;

/**
 * 끝나지 않은 실행을 "도는 중" 으로 볼 수 있는 시간. 이보다 오래면 끊긴 것으로 읽는다.
 * 60분인 이유: 가장 긴 실행(psstore 가격 한 바퀴)이 실측 약 8분이고, 서울 리전 크론이 몰릴 때
 * 대기까지 붙어도 그 몇 배 안에 끝난다. 실제로 wikidata_game 은 finished_at 이 없는 행을
 * 며칠째 남기고 있었는데(2026-09-21 실측), 그건 도는 중이 아니라 끊긴 것이다.
 */
export const RUNNING_GRACE_MINUTES = 60;

export interface RecentTitle {
  title: string;
  checkedAt: Date;
}

export interface SyncActivity {
  /** 소스별 마지막으로 만진 게임 제목 */
  recent: Map<SourceName, RecentTitle[]>;
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

  type RecentRow = { source: SourceName; title: string; checked_at: string };
  type TotalRow = { new_games: string; snapshots: string; runs: string };

  const [recentRes, totalRes] = await Promise.all([
    db.execute(sql`
      with top as (
        select s.source, x.game_id, x.checked_at
        from (select unnest(enum_range(null::source)) source) s
        cross join lateral (
          select r.game_id, r.checked_at
          from game_source_refs r
          where r.source = s.source and r.matched_by in ('auto', 'manual')
          order by r.checked_at desc
          limit ${RECENT_TITLES_PER_SOURCE}
        ) x
      )
      select t.source, coalesce(g.title_ko, g.title_en) as title, t.checked_at
      from top t join games g on g.id = t.game_id
      order by t.source, t.checked_at desc
    `),
    db.execute(sql`
      select
        (select count(*) from games where created_at >= now() - interval '24 hours') as new_games,
        (select count(*) from price_snapshots where captured_at >= now() - interval '24 hours') as snapshots,
        (select count(*) from sync_logs where started_at >= now() - interval '24 hours') as runs
    `),
  ]);

  const totals = (totalRes.rows as TotalRow[])[0];
  const recent = new Map<SourceName, RecentTitle[]>();
  for (const row of recentRes.rows as RecentRow[]) {
    const list = recent.get(row.source) ?? [];
    list.push({ title: row.title, checkedAt: new Date(row.checked_at) });
    recent.set(row.source, list);
  }

  return {
    recent,
    asOf: Date.now(),
    newGames: Number(totals?.new_games ?? 0),
    priceSnapshots: Number(totals?.snapshots ?? 0),
    runs: Number(totals?.runs ?? 0),
  };
}
