// /admin/sync — 수집 현황. 스토어마다 지금 무엇을 어떻게 수집하고 있는지 본다. 읽기 전용 — 재실행은 GitHub Actions.
//
// 앞서 이 화면에는 매칭 검수 큐가 함께 살았다. 뗀 이유는 둘이 하는 일이 다르기 때문이다 —
// 현황은 읽고 지나가는 자리고 큐는 눌러야 줄이 줄어드는 자리다.
//
// 2026-09-21 손질 — "제대로 수집하고 있는지 판단하기 힘들다" 는 말을 들었다. 앞 화면이 세던 값
// (상태 배지, 처리 건수)은 **돌았다**까지만 말하고 **무엇을 했는지**는 말하지 않았다. 셋을 더했다:
//   1. 맨 위 24시간 요약 — 새 게임, 가격 기록, 실행 수. 소스 하나하나를 보기 전에 "오늘 이 서비스에
//      값이 들어오긴 했나" 를 한 줄로 답한다. 이 줄이 0이면 아래 배지가 전부 초록이어도 고장이다.
//   2. 소스마다 **가져온 게임**. 처음엔 제목 세 줄이었는데 2026-09-30 에 시트로 바꿨다 — 제목만으로는
//      "무엇을 가져왔나"(가격인지 커버인지 확인만 했는지)가 안 보였다. 이제 마지막 기록 실행이 만진 게임과
//      바뀐 값을 버튼 하나 뒤의 시트에 싣는다(admin-activity, sync/touched 주석).
//   3. "도는 중" 과 "끊김" 을 가른다. 앞 화면은 끝나지 않은 실행을 전부 "도는 중이거나 끊김" 한 말로
//      적었다 — 그래서 며칠째 안 끝난 실행이 정상처럼 보였다(wikidata_game 실측).
//
// 2026-10-29 — 관리자 첫 화면 자리를 업무 현황판(admin/page)에 내주고 /admin/sync 로 옮겼다. 10-26 에 머리에 얹었던
// "지금 손볼 일" 칸 줄은 현황판이 묶음별로 넓혀 맡는다. 손볼 상태를 가르는 규칙은 현황판과 같이 쓴다(lib/admin/sync-health).
//
// 2026-10-28 손질 — "투박하다, 컴팩트하게, 서비스 기획 관점으로". 운영자가 이 화면을 여는 까닭은 두 가지다 —
// "내가 손볼 일이 있나" 와 "수집이 아픈 곳이 있나". 앞 판은 카드 열다섯 장이 화면 세 개 높이로 서서 둘째 질문의 답(실패 줄)이
// 접힌 선 아래에 있었다. 카드를 표 한 장으로 접고(줄 하나가 스토어 하나), 24시간 요약은 표 머리 오른쪽에 붙였다.
// 손볼 줄을 앞으로 당기는 규칙과 띠는 그대로다. 에러 맛보기와 쉬는 까닭은 그 줄 밑에 한 줄로 눕는다.
//
// 2026-10-08 손질 — "가시성이 안 좋다". 카드 열다섯이 같은 무게로 서서 손볼 곳(일부 실패, 끊김)이
// 작은 배지 하나로만 갈렸다. 손볼 카드를 **앞으로 당기고** 왼쪽에 띠를 긋는다. 순서는 바꾸되 무엇을
// 보여 주는지는 그대로다 — 정상 카드 사이의 순서(서비스의 SOURCES 순서)는 유지한다.
import { AdminLead } from "@/components/admin/admin-lead";
import type { Metadata } from "next";
import Link from "next/link";
import { buttonClass } from "@/components/ui/button";
import { formatAgo, formatDateTime } from "@/lib/format";
import { SYNC_MESSAGES, SYNC_STATUS_LABEL, sourceLabel } from "@/lib/admin/messages";
import { ROUTES } from "@/lib/routes";
import { getSyncOverview, type SyncLogRow, type SyncOverviewItem } from "@/server/services/admin";
import { getSyncActivity, RUNNING_GRACE_MINUTES, type RunSummary } from "@/server/services/admin-activity";
import { syncHealthOf } from "@/lib/admin/sync-health";
import { getDisabledReason, isSource } from "@/server/adapters";
import { requireRoleOrForbid } from "@/server/auth/guards";
import { PageHead } from "@/components/ui/page";
import { DataCell, DataHead, DataList, DataRow } from "@/components/admin/data-rows";
import { SYNC_SOURCE_COLS } from "@/lib/admin/table-cols";
import { SyncRunSheet } from "@/components/admin/sync-run-sheet";
import { Clamp } from "@/components/ui/tooltip";
import { cn } from "@/lib/cn";
import { SYNC_BADGE_SHAPE, SYNC_STATUS_BADGE, SYNC_STATUS_STRIPE } from "@/components/admin/sync-tone";

/** 줄 밑에 노출할 에러 샘플 길이. 전문은 실행 로그 화면에서 본다 */
const ERROR_SAMPLE_PREVIEW_LEN = 300;

export const metadata: Metadata = { title: SYNC_MESSAGES.title };

/**
 * 카드 머리의 상태 한 칸. 색과 말이 같은 곳에서 나와야 둘이 어긋나지 않는다.
 * rank 는 카드를 세우는 순서다 — 사람이 손봐야 하는 것(끊김, 실패)이 앞이고, 쉬는 소스가 맨 뒤다.
 */
type Tone = { label: string; style: string; stripe: string; rank: number; live?: boolean };

const RANK = { stalled: 0, failed: 1, partial: 2, running: 3, ok: 4, idle: 5 } as const;

function statusOf(latest: SyncLogRow | null, disabledReason: string | undefined, now: number): Tone {
  const health = syncHealthOf(latest, Boolean(disabledReason), now, RUNNING_GRACE_MINUTES);
  if (health === "idle") {
    return { label: disabledReason ? SYNC_MESSAGES.disabled : SYNC_MESSAGES.noRun, style: "bg-surface-3 text-mut", stripe: "", rank: RANK.idle };
  }
  if (health === "running") return { label: SYNC_MESSAGES.running, style: "bg-acc-soft text-acc", stripe: "", rank: RANK.running, live: true };
  if (health === "stalled") {
    return { label: SYNC_MESSAGES.stalled, style: SYNC_STATUS_BADGE.failed, stripe: SYNC_STATUS_STRIPE.failed, rank: RANK.stalled };
  }
  return { label: SYNC_STATUS_LABEL[health] ?? health, style: SYNC_STATUS_BADGE[health], stripe: SYNC_STATUS_STRIPE[health], rank: RANK[health] };
}

function disabledReasonOf(item: SyncOverviewItem): string | undefined {
  return isSource(item.source) ? getDisabledReason(item.source) : undefined;
}

/** 최근 24시간 숫자 넷. 소스별 배지가 전부 초록이어도 이 줄이 0이면 값이 안 들어오고 있다는 뜻이다 */
function Totals({
  newGames,
  snapshots,
  runs,
  failedToday,
}: {
  newGames: number;
  snapshots: number;
  runs: number;
  failedToday: number;
}) {
  const items = [
    { label: SYNC_MESSAGES.totalNewGames, value: newGames, alert: false },
    { label: SYNC_MESSAGES.totalSnapshots, value: snapshots, alert: false },
    { label: SYNC_MESSAGES.totalRuns, value: runs, alert: false },
    { label: SYNC_MESSAGES.totalFailed, value: failedToday, alert: failedToday > 0 },
  ];
  return (
    <dl className="flex flex-wrap items-baseline gap-x-4 gap-y-1 text-[12px]">
      <span className="font-semibold text-dim-2">{SYNC_MESSAGES.last24h}</span>
      {items.map((it) => (
        <div key={it.label} className="flex items-baseline gap-1.5">
          <dt className="text-mut">{it.label}</dt>
          <dd className={cn("text-[14px] font-bold tabular-nums", it.alert ? "text-danger" : "text-ink")}>{it.value.toLocaleString("ko-KR")}</dd>
        </div>
      ))}
    </dl>
  );
}

const COLS = [
  SYNC_MESSAGES.colSource,
  SYNC_MESSAGES.colStatus,
  SYNC_MESSAGES.finishedAt,
  SYNC_MESSAGES.colProcessed,
  SYNC_MESSAGES.failedToday,
  SYNC_MESSAGES.discovery,
  SYNC_MESSAGES.colRun,
  SYNC_MESSAGES.colLogs,
];

function SourceRow({ item, tone, run, now }: { item: SyncOverviewItem; tone: Tone; run: RunSummary | undefined; now: number }) {
  const l = item.latest;
  const disabledReason = disabledReasonOf(item);
  const d = l?.discovery;
  const note = l?.errorSample ? l.errorSample.slice(0, ERROR_SAMPLE_PREVIEW_LEN) : disabledReason;

  return (
    <DataRow cols={cn(SYNC_SOURCE_COLS, "relative", disabledReason && "opacity-60")}>
      {/* 띠는 손볼 줄에만 긋는다 — 띠가 있는 줄만 봐도 손볼 곳이 다 보이게 */}
      {tone.stripe && <span aria-hidden className={cn("absolute inset-y-1.5 left-0 w-[3px] rounded-full", tone.stripe)} />}
      <DataCell>
        {/* 스토어 이름은 한글로 띄우고, 로그를 맞대 볼 때 쓰는 원값은 곁에 작게 남긴다 */}
        <p className="flex min-w-0 items-baseline gap-1.5">
          <span className="min-w-0 font-semibold text-ink">
            <Clamp>{sourceLabel(item.source)}</Clamp>
          </span>
          <span className="shrink-0 font-mono text-[11px] text-dim">{item.source}</span>
        </p>
      </DataCell>
      <DataCell label={SYNC_MESSAGES.colStatus}>
        <span className={cn(SYNC_BADGE_SHAPE, tone.style)}>
          {/* 도는 중인 칸만 점이 숨 쉰다. 멈춘 화면에서 움직이는 것은 "지금 일어나는 일" 뿐이어야 한다 */}
          {tone.live && <span aria-hidden className="size-1.5 animate-pulse rounded-full bg-acc" />}
          {tone.label}
        </span>
      </DataCell>
      {/* 신선도가 먼저다 — "최근인가" 를 사람이 시각에서 빼서 세던 자리다(formatAgo 주석). 정확한 시각은 로그와 맞대 볼 때 쓴다 */}
      <DataCell label={SYNC_MESSAGES.finishedAt} className="tabular-nums">
        {l ? (
          <>
            <span className="text-ink">{formatAgo(l.finishedAt ?? l.startedAt, now)}</span>
            <span className="ml-1.5 text-[11.5px] text-dim">{formatDateTime(l.finishedAt ?? l.startedAt)}</span>
          </>
        ) : (
          <span className="text-dim">{SYNC_MESSAGES.neverRan}</span>
        )}
      </DataCell>
      <DataCell label={SYNC_MESSAGES.colProcessed} className="tabular-nums">
        {l ? (
          <>
            {(l.processed ?? 0).toLocaleString("ko-KR")}
            <span className="text-dim"> | </span>
            <span className={(l.failed ?? 0) > 0 ? "font-semibold text-danger" : "text-mut"}>{l.failed ?? 0}</span>
          </>
        ) : (
          "-"
        )}
      </DataCell>
      <DataCell label={SYNC_MESSAGES.failedToday} className={cn("tabular-nums", item.failedToday > 0 ? "font-semibold text-danger" : "text-mut")}>
        {`${item.failedToday}회`}
      </DataCell>
      <DataCell label={SYNC_MESSAGES.discovery} className="text-[12px] text-mut">
        {d ? <Clamp>{SYNC_MESSAGES.discoverySummary(d.pages, d.scanned, d.fresh, d.startPage)}</Clamp> : <span className="text-dim-2">-</span>}
      </DataCell>
      <DataCell label={SYNC_MESSAGES.colRun}>
        {run && run.total > 0 ? (
          <SyncRunSheet source={item.source} sourceName={sourceLabel(item.source)} run={run} now={now} inline />
        ) : (
          <span className="text-dim-2">-</span>
        )}
      </DataCell>
      <DataCell>
        <Link href={`${ROUTES.adminSyncLogs}?source=${item.source}`} className="tap inline-flex items-center text-[12.5px] font-medium text-acc hover:underline">
          {SYNC_MESSAGES.logsShort}
        </Link>
      </DataCell>
      {/* 에러 맛보기, 쉬는 까닭은 줄 밑에 한 줄로 눕는다. 접어 두지 않는다 — 왜 안 도는지 모르면 고장으로 읽는다. 전문은 말풍선 */}
      {note && (
        <DataCell className="md:col-span-full md:pt-1">
          <Clamp lines={1} className={cn("break-words text-[12px]", l?.errorSample ? "text-danger" : "text-dim")}>
            {note}
          </Clamp>
        </DataCell>
      )}
    </DataRow>
  );
}

export default async function AdminSyncOverviewPage() {
  await requireRoleOrForbid("admin");
  // 둘을 나란히 던진다 — 줄 세우면 왕복이 그대로 쌓인다(Neon 왕복 비용)
  const [overview, activity] = await Promise.all([getSyncOverview(), getSyncActivity()]);
  const repo = process.env.NEXT_PUBLIC_GITHUB_REPO;
  const failedToday = overview.items.reduce((n, it) => n + it.failedToday, 0);
  // sort 는 안정 정렬이라 같은 칸끼리는 서비스가 준 순서 그대로다
  const rows = overview.items
    .map((item) => ({ item, tone: statusOf(item.latest, disabledReasonOf(item), activity.asOf) }))
    .sort((a, b) => a.tone.rank - b.tone.rank);

  return (
    <section className="flex flex-col gap-4">
      <header className="flex flex-wrap items-start justify-between gap-x-6 gap-y-2">
        <div className="min-w-0">
          <PageHead size="admin" title={SYNC_MESSAGES.title} />
          <AdminLead>{SYNC_MESSAGES.lead}</AdminLead>
        </div>
        {repo ? (
          <a href={`https://github.com/${repo}/actions`} target="_blank" rel="noreferrer" className={buttonClass({ variant: "secondary", size: "sm" })}>
            {SYNC_MESSAGES.rerun}
            <span className="sr-only"> (새 창에서 열림)</span>
          </a>
        ) : (
          <span className="max-w-[320px] text-[11.5px] text-dim">{SYNC_MESSAGES.rerunHint}</span>
        )}
      </header>

      <section aria-labelledby="sync-sources" className="flex flex-col gap-2">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <h2 id="sync-sources" className="text-[14px] font-bold text-ink">
            {SYNC_MESSAGES.sourcesTitle}
          </h2>
          <Totals newGames={activity.newGames} snapshots={activity.priceSnapshots} runs={activity.runs} failedToday={failedToday} />
        </div>
        <div>
          <DataHead cols={SYNC_SOURCE_COLS} labels={COLS} />
          <DataList>
            {rows.map(({ item, tone }) => (
              <SourceRow key={item.source} item={item} tone={tone} run={activity.lastRuns.get(item.source)} now={activity.asOf} />
            ))}
          </DataList>
        </div>
      </section>

      <Link href={ROUTES.adminSyncLogs} className="tap inline-flex w-fit items-center text-[13px] font-medium text-acc hover:underline">
        {SYNC_MESSAGES.allLogs}
      </Link>
    </section>
  );
}
