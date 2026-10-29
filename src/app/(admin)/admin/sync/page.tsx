// /admin/sync — 수집현황. 스토어마다 지금 무엇을 어떻게 수집하고 있는지 본다. 읽기 전용 — 재실행은 GitHub Actions.
//
// 앞서 이 화면에는 매칭 검수 큐가 함께 살았다. 뗀 이유는 둘이 하는 일이 다르기 때문이다 —
// 현황은 읽고 지나가는 자리고 큐는 눌러야 줄이 줄어드는 자리다.
//
// 2026-09-21 손질 — "제대로 수집하고 있는지 판단하기 힘들다" 는 말을 들었다. 앞 화면이 세던 값
// (상태 배지, 처리 건수)은 **돌았다**까지만 말하고 **무엇을 했는지**는 말하지 않았다. 셋을 더했다:
//   1. 24시간 요약 — 새 게임, 가격 기록, 실행 수. 소스 하나하나를 보기 전에 "오늘 이 서비스에
//      값이 들어오긴 했나" 를 한 줄로 답한다. 이 줄이 0이면 아래 배지가 전부 초록이어도 고장이다.
//      그래서 붙어 따라오는 화면 머리(note)에 둔다 — 조회조건을 걸어도, 목록을 내려도 보인다.
//   2. 소스마다 **가져온 게임**(2026-09-30 시트). 마지막 기록 실행이 만진 게임과 바뀐 값(admin-activity, sync/touched 주석).
//   3. "도는 중" 과 "끊김" 을 가른다. 앞 화면은 끝나지 않은 실행을 전부 "도는 중이거나 끊김" 한 말로
//      적었다 — 그래서 며칠째 안 끝난 실행이 정상처럼 보였다(wikidata_game 실측).
//
// 2026-10-08 — 손볼 줄(끊김, 실패, 일부 실패)을 **앞으로 당긴다**. 정상 줄 사이의 순서(서비스의 SOURCES 순서)는 유지한다.
// 2026-10-29 — 화면 구성을 백오피스 조회 화면 꼴로 옮겼다(components/admin/sync-screen). 여기는 읽고, 조회조건(스토어, 상태)으로 거르고,
// 직렬화되는 줄로 펴서 넘기기만 한다. 칸을 그리는 함수는 서버에서 못 넘겨 화면 쪽에 있다.
// 거르기는 읽은 뒤에 한다 — 소스가 열댓 줄이라 질의를 나눌 값이 없고, 24시간 요약은 조건과 상관없이 전체를 말해야 한다.
import type { Metadata } from "next";
import { AdminScreenHead } from "@/components/admin/screen/head";
import { ProgramLink } from "@/components/admin/screen/program-link";
import { SyncScreen, type SyncSourceRow } from "@/components/admin/sync-screen";
import { buttonClass } from "@/components/ui/button";
import { SYNC_MESSAGES, sourceLabel, ADMIN_NAV } from "@/lib/admin/messages";
import { isSyncHealthFilter, matchesHealthFilter, syncHealthOf, type SyncHealth } from "@/lib/admin/sync-health";
import { cn } from "@/lib/cn";
import { firstParam } from "@/lib/games-query";
import { ROUTES } from "@/lib/routes";
import { getSyncOverview, isSourceName, SOURCES, type SyncOverviewItem } from "@/server/services/admin";
import { getSyncActivity, RUNNING_GRACE_MINUTES, type RunSummary } from "@/server/services/admin-activity";
import { getDisabledReason, isSource } from "@/server/adapters";
import { requireRoleOrForbid } from "@/server/auth/guards";

export const metadata: Metadata = { title: ADMIN_NAV.overview };

/** 줄 세우는 순서 — 사람이 손봐야 하는 것(끊김, 실패)이 앞이고, 쉬는 소스가 맨 뒤다 */
const RANK: Record<SyncHealth, number> = { stalled: 0, failed: 1, partial: 2, running: 3, ok: 4, idle: 5 };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

function disabledReasonOf(item: SyncOverviewItem): string | undefined {
  return isSource(item.source) ? getDisabledReason(item.source) : undefined;
}

function toRow(item: SyncOverviewItem, run: RunSummary | undefined, now: number): SyncSourceRow {
  const l = item.latest;
  const disabledReason = disabledReasonOf(item) ?? null;
  const d = l?.discovery;
  return {
    source: item.source,
    name: sourceLabel(item.source),
    health: syncHealthOf(l, Boolean(disabledReason), now, RUNNING_GRACE_MINUTES),
    disabledReason,
    startedAt: l?.startedAt ?? null,
    finishedAt: l?.finishedAt ?? null,
    processed: l?.processed ?? 0,
    failed: l?.failed ?? 0,
    errorSample: l?.errorSample ?? null,
    discovery: d ? { pages: d.pages, scanned: d.scanned, fresh: d.fresh, startPage: d.startPage } : null,
    failedToday: item.failedToday,
    run: run ?? null,
  };
}

/** 최근 24시간 숫자 넷. 소스별 배지가 전부 초록이어도 이 줄이 0이면 값이 안 들어오고 있다는 뜻이다 */
function Totals({ newGames, snapshots, runs, failedToday }: { newGames: number; snapshots: number; runs: number; failedToday: number }) {
  const items = [
    { label: SYNC_MESSAGES.totalNewGames, value: newGames, alert: false },
    { label: SYNC_MESSAGES.totalSnapshots, value: snapshots, alert: false },
    { label: SYNC_MESSAGES.totalRuns, value: runs, alert: false },
    { label: SYNC_MESSAGES.totalFailed, value: failedToday, alert: failedToday > 0 },
  ];
  return (
    <span className="inline-flex flex-wrap items-baseline gap-x-1.5">
      <span className="font-semibold text-dim-2">{SYNC_MESSAGES.last24h}</span>
      {items.map((it) => (
        <span key={it.label} className="inline-flex items-baseline gap-1">
          <span aria-hidden>|</span>
          <span className="text-mut">{it.label}</span>
          <b className={cn("font-bold tabular-nums", it.alert ? "text-danger" : "text-ink")}>{it.value.toLocaleString("ko-KR")}</b>
        </span>
      ))}
    </span>
  );
}

export default async function AdminSyncOverviewPage({ searchParams }: Props) {
  await requireRoleOrForbid("admin");
  const sp = await searchParams;
  const rawSource = firstParam(sp.source);
  const source = isSourceName(rawSource) ? rawSource : "all";
  const rawStatus = firstParam(sp.status);
  const status = isSyncHealthFilter(rawStatus) ? rawStatus : "all";
  // 둘을 나란히 던진다 — 줄 세우면 왕복이 그대로 쌓인다(Neon 왕복 비용)
  const [overview, activity] = await Promise.all([getSyncOverview(), getSyncActivity()]);
  const repo = process.env.NEXT_PUBLIC_GITHUB_REPO;
  const failedToday = overview.items.reduce((n, it) => n + it.failedToday, 0);
  // sort 는 안정 정렬이라 같은 칸끼리는 서비스가 준 순서 그대로다
  const rows = overview.items
    .map((item) => toRow(item, activity.lastRuns.get(item.source), activity.asOf))
    .filter((r) => (source === "all" || r.source === source) && matchesHealthFilter(r.health, status))
    .sort((a, b) => RANK[a.health] - RANK[b.health]);

  return (
    <>
      <AdminScreenHead
        title={ADMIN_NAV.overview}
        count={rows.length}
        note={<Totals newGames={activity.newGames} snapshots={activity.priceSnapshots} runs={activity.runs} failedToday={failedToday} />}
        actions={
          <>
            {/* 스토어 하나의 이력은 상세의 같은 단추가 그 스토어로 걸러 연다 */}
            <ProgramLink href={ROUTES.adminSyncLogs}>{ADMIN_NAV.logs}</ProgramLink>
            {repo ? (
              <a href={`https://github.com/${repo}/actions`} target="_blank" rel="noreferrer" className={buttonClass({ variant: "secondary", size: "sm" })}>
                {SYNC_MESSAGES.rerun}
                <span className="sr-only"> (새 창에서 열림)</span>
              </a>
            ) : (
              <span className="max-w-[320px] text-[11.5px] text-dim">{SYNC_MESSAGES.rerunHint}</span>
            )}
          </>
        }
      />
      <SyncScreen rows={rows} asOf={activity.asOf} sources={SOURCES.map((s) => ({ value: s, label: sourceLabel(s) }))} source={source} status={status} />
    </>
  );
}
