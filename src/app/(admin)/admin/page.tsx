// /admin — 수집 현황. 스토어마다 지금 무엇을 어떻게 수집하고 있는지 본다. 읽기 전용 — 재실행은 GitHub Actions.
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
// 2026-10-08 손질 — "가시성이 안 좋다". 카드 열다섯이 같은 무게로 서서 손볼 곳(일부 실패, 끊김)이
// 작은 배지 하나로만 갈렸다. 손볼 카드를 **앞으로 당기고** 왼쪽에 띠를 긋는다. 순서는 바꾸되 무엇을
// 보여 주는지는 그대로다 — 정상 카드 사이의 순서(서비스의 SOURCES 순서)는 유지한다.
import type { Metadata } from "next";
import Link from "next/link";
import { buttonClass } from "@/components/ui/button";
import { formatAgo, formatDateTime } from "@/lib/format";
import { SYNC_MESSAGES, SYNC_STATUS_LABEL, sourceLabel } from "@/lib/admin/messages";
import { ROUTES } from "@/lib/routes";
import { getSyncOverview, type SyncLogRow, type SyncOverviewItem } from "@/server/services/admin";
import { getSyncActivity, RUNNING_GRACE_MINUTES, type RunSummary } from "@/server/services/admin-activity";
import { getDisabledReason, isSource } from "@/server/adapters";
import { requireRoleOrForbid } from "@/server/auth/guards";
import { PageHead, Panel, raisedClass } from "@/components/ui/page";
import { SyncRunSheet } from "@/components/admin/sync-run-sheet";
import { Clamp } from "@/components/ui/tooltip";
import { cn } from "@/lib/cn";
import { SYNC_BADGE_SHAPE, SYNC_STATUS_BADGE, SYNC_STATUS_STRIPE } from "@/components/admin/sync-tone";

/** 카드에 노출할 에러 샘플 길이. 전문은 실행 로그 화면에서 본다 */
const ERROR_SAMPLE_PREVIEW_LEN = 300;

export const metadata: Metadata = { title: SYNC_MESSAGES.title };

/**
 * 카드 머리의 상태 한 칸. 색과 말이 같은 곳에서 나와야 둘이 어긋나지 않는다.
 * rank 는 카드를 세우는 순서다 — 사람이 손봐야 하는 것(끊김, 실패)이 앞이고, 쉬는 소스가 맨 뒤다.
 */
type Tone = { label: string; style: string; stripe: string; rank: number; live?: boolean };

const RANK = { stalled: 0, failed: 1, partial: 2, running: 3, ok: 4, idle: 5 } as const;

function statusOf(latest: SyncLogRow | null, disabledReason: string | undefined, now: number): Tone {
  if (disabledReason) return { label: SYNC_MESSAGES.disabled, style: "bg-surface-3 text-mut", stripe: "", rank: RANK.idle };
  if (!latest) return { label: SYNC_MESSAGES.noRun, style: "bg-surface-3 text-mut", stripe: "", rank: RANK.idle };
  if (!latest.finishedAt) {
    const mins = (now - latest.startedAt.getTime()) / 60000;
    return mins <= RUNNING_GRACE_MINUTES
      ? { label: SYNC_MESSAGES.running, style: "bg-acc-soft text-acc", stripe: "", rank: RANK.running, live: true }
      : { label: SYNC_MESSAGES.stalled, style: SYNC_STATUS_BADGE.failed, stripe: SYNC_STATUS_STRIPE.failed, rank: RANK.stalled };
  }
  return {
    label: SYNC_STATUS_LABEL[latest.status] ?? latest.status,
    style: SYNC_STATUS_BADGE[latest.status],
    stripe: SYNC_STATUS_STRIPE[latest.status],
    rank: RANK[latest.status],
  };
}

function disabledReasonOf(item: SyncOverviewItem): string | undefined {
  return isSource(item.source) ? getDisabledReason(item.source) : undefined;
}

function Metric({ label, value, alert = false }: { label: string; value: string; alert?: boolean }) {
  return (
    <div className="flex justify-between gap-3 text-[12px] text-mut">
      <dt className="shrink-0">{label}</dt>
      <dd className={`min-w-0 text-right ${alert ? "font-semibold text-danger" : "text-ink"}`}>{value}</dd>
    </div>
  );
}

/** 최근 24시간 한 줄. 소스별 배지가 전부 초록이어도 이 줄이 0이면 값이 안 들어오고 있다는 뜻이다 */
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
    <Panel className="flex flex-wrap items-center gap-x-8 gap-y-3 px-5 py-4">
      <span className="text-[11.5px] font-bold tracking-[0.08em] text-dim-2">{SYNC_MESSAGES.last24h}</span>
      {items.map((it) => (
        <div key={it.label} className="flex items-baseline gap-2">
          <span className="text-[12px] text-mut">{it.label}</span>
          <span className={`text-[19px] font-bold tabular-nums ${it.alert ? "text-danger" : "text-ink"}`}>
            {it.value.toLocaleString("ko-KR")}
          </span>
        </div>
      ))}
    </Panel>
  );
}

function SourceCard({ item, tone, run, now }: { item: SyncOverviewItem; tone: Tone; run: RunSummary | undefined; now: number }) {
  const l = item.latest;
  const disabledReason = disabledReasonOf(item);
  const d = l?.discovery;

  return (
    // 소스 하나가 흰 판 한 장이다. 예전엔 판 대신 위쪽 헤어라인 한 줄로 칸을 갈랐는데, 격자에서 칸이
    // 가로로 이어지면 선이 한 줄로 붙어 어느 값이 어느 스토어 것인지 안 갈렸다(2026-09-30 사용자: "구분이 잘 안되네").
    // 관리자 셸이 회색 바탕 위 흰 판이라(할 일 카드와 같은 면) 판 한 겹이면 상자 속 상자가 되지 않는다
    // 띠는 손볼 카드에만 긋는다 — 할 일 카드의 띠와 같은 모양이다(task-card)
    <div className={raisedClass(cn("relative flex flex-col gap-2.5 overflow-hidden p-4", disabledReason && "opacity-60"))}>
      {tone.stripe && <span aria-hidden className={cn("absolute inset-y-0 left-0 w-[3px]", tone.stripe)} />}
      <div className="flex items-center justify-between gap-2">
        {/* 스토어 이름은 한글로 띄우고, 로그를 맞대 볼 때 쓰는 원값은 그 밑에 작게 남긴다 */}
        <h3 className="min-w-0 text-[13.5px] font-bold text-ink">
          <Clamp>{sourceLabel(item.source)}</Clamp>
          <span className="mt-0.5 block font-mono text-[11px] font-normal text-dim">{item.source}</span>
        </h3>
        <span className={cn(SYNC_BADGE_SHAPE, tone.style)}>
          {/* 도는 중인 칸만 점이 숨 쉰다. 멈춘 화면에서 움직이는 것은 "지금 일어나는 일" 뿐이어야 한다 */}
          {tone.live && <span aria-hidden className="size-1.5 animate-pulse rounded-full bg-acc" />}
          {tone.label}
        </span>
      </div>

      {l ? (
        <dl className="flex flex-col gap-1">
          {/* 신선도가 먼저다 — "최근인가" 를 사람이 시각에서 빼서 세던 자리다(formatAgo 주석).
              정확한 시각은 로그와 맞대 볼 때 필요하므로 같이 남긴다 */}
          <Metric
            label={SYNC_MESSAGES.finishedAt}
            value={`${formatAgo(l.finishedAt ?? l.startedAt, now)} | ${formatDateTime(l.finishedAt ?? l.startedAt)}`}
          />
          <Metric label={SYNC_MESSAGES.processedFailed} value={`${l.processed ?? 0} | ${l.failed ?? 0}`} />
          <Metric label={SYNC_MESSAGES.failedToday} value={`${item.failedToday}회`} alert={item.failedToday > 0} />
          {d && (
            <Metric label={SYNC_MESSAGES.discovery} value={SYNC_MESSAGES.discoverySummary(d.pages, d.scanned, d.fresh, d.startPage)} />
          )}
        </dl>
      ) : (
        <p className="text-[12px] text-dim">{SYNC_MESSAGES.neverRan}</p>
      )}

      {run && run.total > 0 && <SyncRunSheet source={item.source} sourceName={sourceLabel(item.source)} run={run} now={now} />}

      {l?.errorSample && (
        <div>
          <p className="mb-1 text-[11.5px] text-dim">{SYNC_MESSAGES.errorSample}</p>
          {/* 고정폭 글꼴을 걷었다 — 한글이 섞인 에러 문구가 낱자 사이로 벌어져 안 읽혔다(실행 로그와 같은 결정) */}
          <div className="rounded-[7px] bg-surface-4 px-2.5 py-2 text-[12px] leading-[1.55] text-mut">
            <Clamp lines={3} className="break-words">
              {l.errorSample.slice(0, ERROR_SAMPLE_PREVIEW_LEN)}
            </Clamp>
          </div>
        </div>
      )}

      {/* 쉬는 까닭은 접어 두지 않는다 — 왜 안 도는지 모르면 고장으로 읽는다 */}
      {/* 다만 사유 전문은 몇 줄씩 길다 — 세 줄로 자르고 전문은 말풍선으로 본다 */}
      {disabledReason && (
        <Clamp lines={3} className="text-[12px] leading-[1.55] text-dim">
          {disabledReason}
        </Clamp>
      )}

      {/* tap: 카드 바닥의 이 한 줄이 소스마다 유일한 링크다 — 12px 글자 한 줄은 손가락 목표가 못 된다 */}
      <Link href={`${ROUTES.adminSyncLogs}?source=${item.source}`} className="tap inline-flex w-fit items-center text-[12px] text-acc hover:underline">
        {SYNC_MESSAGES.sourceLogs}
      </Link>
    </div>
  );
}

export default async function AdminSyncOverviewPage() {
  await requireRoleOrForbid("admin");
  // 둘을 나란히 던진다 — 줄 세우면 왕복이 그대로 쌓인다(Neon 왕복 비용)
  const [overview, activity] = await Promise.all([getSyncOverview(), getSyncActivity()]);
  const repo = process.env.NEXT_PUBLIC_GITHUB_REPO;
  const failedToday = overview.items.reduce((n, it) => n + it.failedToday, 0);
  // sort 는 안정 정렬이라 같은 칸끼리는 서비스가 준 순서 그대로다
  const cards = overview.items
    .map((item) => ({ item, tone: statusOf(item.latest, disabledReasonOf(item), activity.asOf) }))
    .sort((a, b) => a.tone.rank - b.tone.rank);

  return (
    <section className="flex flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
        <div>
          <PageHead title={SYNC_MESSAGES.title} />
          <p className="mt-1.5 max-w-[620px] text-[13.5px] leading-[1.7] text-mut">{SYNC_MESSAGES.lead}</p>
        </div>
        {repo ? (
          <a
            href={`https://github.com/${repo}/actions`}
            target="_blank"
            rel="noreferrer"
            className={buttonClass({ variant: "secondary" })}
          >
            {SYNC_MESSAGES.rerun}
            <span className="sr-only"> (새 창에서 열림)</span>
          </a>
        ) : (
          <span className="max-w-[320px] text-[11.5px] text-dim">{SYNC_MESSAGES.rerunHint}</span>
        )}
      </header>

      <Totals newGames={activity.newGames} snapshots={activity.priceSnapshots} runs={activity.runs} failedToday={failedToday} />

      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(250px,100%),1fr))] gap-3">
        {cards.map(({ item, tone }) => (
          <SourceCard key={item.source} item={item} tone={tone} run={activity.lastRuns.get(item.source)} now={activity.asOf} />
        ))}
      </div>

      <Link href={ROUTES.adminSyncLogs} className="tap inline-flex w-fit items-center text-[13px] text-acc hover:underline">
        {SYNC_MESSAGES.allLogs}
      </Link>
    </section>
  );
}
