// /admin — 수집 현황. 스토어마다 지금 무엇을 어떻게 수집하고 있는지 본다. 읽기 전용 — 재실행은 GitHub Actions.
//
// 앞서 이 화면에는 매칭 검수 큐가 함께 살았다. 뗀 이유는 둘이 하는 일이 다르기 때문이다 —
// 현황은 읽고 지나가는 자리고 큐는 눌러야 줄이 줄어드는 자리다.
//
// 2026-09-21 손질 — "제대로 수집하고 있는지 판단하기 힘들다" 는 말을 들었다. 앞 화면이 세던 값
// (상태 배지, 처리 건수)은 **돌았다**까지만 말하고 **무엇을 했는지**는 말하지 않았다. 셋을 더했다:
//   1. 맨 위 24시간 요약 — 새 게임, 가격 기록, 실행 수. 소스 하나하나를 보기 전에 "오늘 이 서비스에
//      값이 들어오긴 했나" 를 한 줄로 답한다. 이 줄이 0이면 아래 배지가 전부 초록이어도 고장이다.
//   2. 소스마다 **방금 만진 게임 제목**. 닌텐도 일본 칸에 일본어 제목이 서면 그 소스는 제 카탈로그를
//      보고 있다는 뜻이고, 며칠째 같은 제목에 머물면 큐 선두가 막힌 것이다(admin-activity 주석).
//   3. "도는 중" 과 "끊김" 을 가른다. 앞 화면은 끝나지 않은 실행을 전부 "도는 중이거나 끊김" 한 말로
//      적었다 — 그래서 며칠째 안 끝난 실행이 정상처럼 보였다(wikidata_game 실측).
import type { Metadata } from "next";
import Link from "next/link";
import { buttonClass } from "@/components/ui/button";
import { formatAgo, formatDateTime } from "@/lib/format";
import { SYNC_MESSAGES, SYNC_STATUS_LABEL, sourceLabel } from "@/lib/admin/messages";
import { ROUTES } from "@/lib/routes";
import { getSyncOverview, type SyncLogRow, type SyncOverviewItem } from "@/server/services/admin";
import { getSyncActivity, RUNNING_GRACE_MINUTES, type RecentTitle } from "@/server/services/admin-activity";
import { getDisabledReason, isSource } from "@/server/adapters";
import { requireRoleOrForbid } from "@/server/auth/guards";
import { PageHead, Panel } from "@/components/ui/page";
import { Clamp } from "@/components/ui/tooltip";

/** 카드에 노출할 에러 샘플 길이. 전문은 실행 로그 화면에서 본다 */
const ERROR_SAMPLE_PREVIEW_LEN = 300;

export const metadata: Metadata = { title: SYNC_MESSAGES.title };

const BADGE = "rounded-[6px] px-2 py-0.5 text-[11.5px] font-semibold";

/** 카드 머리의 상태 한 칸. 색과 말이 같은 곳에서 나와야 둘이 어긋나지 않는다 */
type Tone = { label: string; style: string; live?: boolean };

function statusOf(latest: SyncLogRow | null, disabledReason: string | undefined, now: number): Tone {
  if (disabledReason) return { label: SYNC_MESSAGES.disabled, style: "bg-surface-3 text-mut" };
  if (!latest) return { label: SYNC_MESSAGES.noRun, style: "bg-surface-3 text-mut" };
  if (!latest.finishedAt) {
    const mins = (now - latest.startedAt.getTime()) / 60000;
    return mins <= RUNNING_GRACE_MINUTES
      ? { label: SYNC_MESSAGES.running, style: "bg-acc-soft text-acc", live: true }
      : { label: SYNC_MESSAGES.stalled, style: "bg-danger-soft text-danger" };
  }
  const style =
    latest.status === "ok"
      ? "bg-ok-soft text-ok"
      : latest.status === "partial"
        ? "bg-warn-soft text-warn"
        : "bg-danger-soft text-danger";
  return { label: SYNC_STATUS_LABEL[latest.status] ?? latest.status, style };
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

/** 이 소스가 방금 만진 것. 제목 몇 줄이면 "엉뚱한 카탈로그를 긁고 있나" 가 눈으로 갈린다 */
function RecentTitles({ titles }: { titles: RecentTitle[] }) {
  return (
    <div>
      <p className="mb-1 text-[11.5px] text-dim">{SYNC_MESSAGES.recentTitles}</p>
      <ul className="flex flex-col gap-0.5">
        {titles.map((t) => (
          <li key={`${t.title}-${t.checkedAt.getTime()}`} className="min-w-0 text-[12px] text-mut">
            <Clamp>{t.title}</Clamp>
          </li>
        ))}
      </ul>
    </div>
  );
}

function SourceCard({ item, titles, now }: { item: SyncOverviewItem; titles: RecentTitle[]; now: number }) {
  const l = item.latest;
  const disabledReason = isSource(item.source) ? getDisabledReason(item.source) : undefined;
  const tone = statusOf(l, disabledReason, now);
  const d = l?.discovery;

  return (
    // 소스 하나가 한 칸이다. 판 대신 위쪽 헤어라인 한 줄로 칸을 표시한다 —
    // 소스가 여덟이라 판을 세우면 관리자 화면이 상자 여덟 개로 읽히고, 정작 볼 값(빨간 실패 수)이 묻힌다
    <div className={`flex flex-col gap-2.5 border-t border-line pt-3.5 ${disabledReason ? "opacity-60" : ""}`}>
      <div className="flex items-center justify-between gap-2">
        {/* 스토어 이름은 한글로 띄우고, 로그를 맞대 볼 때 쓰는 원값은 그 밑에 작게 남긴다 */}
        <h3 className="min-w-0 text-[13.5px] font-bold text-ink">
          <Clamp>{sourceLabel(item.source)}</Clamp>
          <span className="mt-0.5 block font-mono text-[11px] font-normal text-dim">{item.source}</span>
        </h3>
        <span className={`${BADGE} inline-flex shrink-0 items-center gap-1.5 ${tone.style}`}>
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
            <Metric label={SYNC_MESSAGES.discovery} value={SYNC_MESSAGES.discoverySummary(d.pages, d.scanned, d.fresh)} />
          )}
        </dl>
      ) : (
        <p className="text-[12px] text-dim">{SYNC_MESSAGES.neverRan}</p>
      )}

      {titles.length > 0 && <RecentTitles titles={titles} />}

      {l?.errorSample && (
        <div>
          <p className="mb-1 text-[11.5px] text-dim">{SYNC_MESSAGES.errorSample}</p>
          <p className="rounded-[7px] bg-surface-4 px-2.5 py-2 font-mono text-[11px] leading-[1.55] text-mut">
            <Clamp lines={3} className="break-all">
              {l.errorSample.slice(0, ERROR_SAMPLE_PREVIEW_LEN)}
            </Clamp>
          </p>
        </div>
      )}

      {/* 쉬는 까닭은 접어 두지 않는다 — 왜 안 도는지 모르면 고장으로 읽는다 */}
      {disabledReason && <p className="text-[11.5px] text-dim">{disabledReason}</p>}

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

      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(250px,100%),1fr))] gap-x-8 gap-y-5">
        {overview.items.map((item) => (
          <SourceCard key={item.source} item={item} titles={activity.recent.get(item.source) ?? []} now={activity.asOf} />
        ))}
      </div>

      <Link href={ROUTES.adminSyncLogs} className="tap inline-flex w-fit items-center text-[13px] text-acc hover:underline">
        {SYNC_MESSAGES.allLogs}
      </Link>
    </section>
  );
}
