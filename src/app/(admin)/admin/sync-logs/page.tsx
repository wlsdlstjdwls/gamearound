// /admin/sync-logs — 실행 로그. 최근 100건 테이블, ?source= 필터.
//
// 수집 현황이 스토어마다 "마지막 한 번" 만 보여 주는 값의 전문이 여기 있다.
// 원값(ok, steam)을 그대로 띄우던 자리를 한글 이름표로 바꿨다 — partial 이 성공인지 실패인지
// 영문으로는 판단이 안 선다. 다만 소스는 로그와 워크플로 이름을 맞대야 해서 원값을 함께 남긴다.
import type { Metadata } from "next";
import { cn } from "@/lib/cn";
import { formatDateTime, formatDuration } from "@/lib/format";
import { ChipLink } from "@/components/ui/chip";
import { isSourceName, listSyncLogs, SOURCES } from "@/server/services/admin";
import { LOG_MESSAGES, SYNC_STATUS_LABEL, sourceLabel } from "@/lib/admin/messages";
import { requireRoleOrForbid } from "@/server/auth/guards";
import { PageHead } from "@/components/ui/page";
import { DataCell, DataHead, DataList, DataRow } from "@/components/admin/data-rows";
import { ROUTES } from "@/lib/routes";
import { Clamp } from "@/components/ui/tooltip";
import { SYNC_BADGE_SHAPE, SYNC_STATUS_BADGE } from "@/components/admin/sync-tone";
import { SYNC_LOG_COLS } from "@/lib/admin/table-cols";

export const metadata: Metadata = { title: LOG_MESSAGES.title };

/**
 * 발견 중단 사유. "예산 소진" 이 이어지면 포화 신호다 — 아는 것만 나오는 구간이 페이지 예산보다 길다는 뜻이라
 * 예산을 올리거나 발견 시작점을 옮겨야 한다. 그래서 이 값만 경고색으로 띄운다.
 */
const DISCOVERY_STOP: Record<string, { label: string; style: string }> = {
  want: { label: LOG_MESSAGES.stopWant, style: "text-ok" },
  budget: { label: LOG_MESSAGES.stopBudget, style: "text-warn" },
  "catalog-end": { label: LOG_MESSAGES.stopCatalogEnd, style: "text-mut" },
};

function duration(start: Date, end: Date | null): string {
  return end ? formatDuration(end.getTime() - start.getTime()) : "-";
}

type SyncLog = Awaited<ReturnType<typeof listSyncLogs>>[number];

function StatusBadge({ status }: { status: SyncLog["status"] }) {
  return <span className={cn(SYNC_BADGE_SHAPE, SYNC_STATUS_BADGE[status])}>{SYNC_STATUS_LABEL[status] ?? status}</span>;
}

/**
 * 좁은 화면에서 실행 하나의 머리 두 줄. 표의 일곱 칸(번호~실패)을 여기 접는다 — 칸마다 이름표를 단
 * 카드로는 실행 하나가 아홉 줄이었다(DataCell wideOnly 주석). 신규 찾기와 에러는 값이 있을 때만 밑에 선다.
 */
function MobileRunHead({ log: l }: { log: SyncLog }) {
  const failed = l.failed ?? 0;
  return (
    <div className="flex flex-col gap-1 md:hidden">
      <div className="flex items-center justify-between gap-2">
        <span className="min-w-0 font-semibold">{sourceLabel(l.source)}</span>
        <StatusBadge status={l.status} />
      </div>
      <p className="text-[12px] text-mut tabular-nums">
        {formatDateTime(l.startedAt)} | {duration(l.startedAt, l.finishedAt)} | {LOG_MESSAGES.colProcessed} {l.processed ?? 0} |{" "}
        <span className={failed > 0 ? "font-semibold text-danger" : undefined}>
          {LOG_MESSAGES.colFailed} {failed}
        </span>
      </p>
    </div>
  );
}

export default async function SyncLogsPage({ searchParams }: { searchParams: Promise<{ source?: string | string[] }> }) {
  await requireRoleOrForbid("admin");
  const sp = await searchParams;
  const raw = typeof sp.source === "string" ? sp.source : undefined;
  const source = isSourceName(raw) ? raw : undefined;
  const logs = await listSyncLogs({ source });

  return (
    <section className="flex flex-col gap-4">
      <header className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <PageHead title={LOG_MESSAGES.title} note={LOG_MESSAGES.recent(logs.length)} />
          <p className="mt-1 max-w-[560px] text-[13px] text-mut">{LOG_MESSAGES.lead}</p>
        </div>
        <div className="flex flex-wrap gap-1 text-xs">
          <ChipLink href={ROUTES.adminSyncLogs} active={!source} size="sm">
            {LOG_MESSAGES.all}
          </ChipLink>
          {SOURCES.map((s) => (
            <ChipLink key={s} href={`${ROUTES.adminSyncLogs}?source=${s}`} active={source === s} size="sm">
              {sourceLabel(s)}
            </ChipLink>
          ))}
        </div>
      </header>

      {logs.length === 0 ? (
        <p className="rounded-xl bg-surface-2 px-5 py-6 text-[13px] text-mut">{LOG_MESSAGES.empty}</p>
      ) : (
        <div>
          <DataHead
            cols={SYNC_LOG_COLS}
            labels={[
              LOG_MESSAGES.colId,
              LOG_MESSAGES.colSource,
              LOG_MESSAGES.colStatus,
              LOG_MESSAGES.colStarted,
              LOG_MESSAGES.colDuration,
              LOG_MESSAGES.colProcessed,
              LOG_MESSAGES.colFailed,
              LOG_MESSAGES.colDiscovery,
            ]}
          />
          <DataList>
            {logs.map((l) => (
              <DataRow key={l.id} cols={SYNC_LOG_COLS} align="start">
                <MobileRunHead log={l} />
                <DataCell label={LOG_MESSAGES.colId} wideOnly className="text-dim">
                  {l.id}
                </DataCell>
                <DataCell label={LOG_MESSAGES.colSource} wideOnly className="md:whitespace-nowrap">
                  {sourceLabel(l.source)}
                </DataCell>
                <DataCell label={LOG_MESSAGES.colStatus} wideOnly>
                  <StatusBadge status={l.status} />
                </DataCell>
                <DataCell label={LOG_MESSAGES.colStarted} wideOnly className="tabular-nums">
                  {formatDateTime(l.startedAt)}
                </DataCell>
                <DataCell label={LOG_MESSAGES.colDuration} wideOnly className="tabular-nums">
                  {duration(l.startedAt, l.finishedAt)}
                </DataCell>
                <DataCell label={LOG_MESSAGES.colProcessed} wideOnly className="tabular-nums">
                  {l.processed ?? 0}
                </DataCell>
                <DataCell label={LOG_MESSAGES.colFailed} wideOnly className={cn("tabular-nums", (l.failed ?? 0) > 0 ? "font-semibold text-danger" : "text-dim")}>
                  {l.failed ?? 0}
                </DataCell>
                <DataCell label={LOG_MESSAGES.colDiscovery} wideOnly={!l.discovery}>
                  {l.discovery ? (
                    <>
                      <span className={DISCOVERY_STOP[l.discovery.stoppedBy]?.style ?? ""}>
                        {DISCOVERY_STOP[l.discovery.stoppedBy]?.label ?? l.discovery.stoppedBy}
                      </span>
                      <span className="block text-[11.5px] text-dim">
                        {LOG_MESSAGES.discoverySummary(l.discovery.pages, l.discovery.scanned, l.discovery.fresh)}
                      </span>
                    </>
                  ) : (
                    <span className="text-dim-2">-</span>
                  )}
                </DataCell>
                {/* 에러가 없는 줄은 밑줄을 아예 세우지 않는다. 고정폭 글꼴을 걷었다 — 한글이 섞인 에러 문구는
                    고정폭에서 낱자 사이가 벌어져 안 읽혔다. 전문은 잘렸을 때만 뜨는 말풍선(Clamp)으로 본다 */}
                {l.errorSample && (
                  <DataCell label={LOG_MESSAGES.colError} className="md:col-span-full md:mt-2">
                    <div className="md:rounded-[7px] md:bg-surface-2 md:px-3 md:py-2">
                      <Clamp lines={2} className="break-words text-[12px] leading-[1.55] text-mut">
                        {l.errorSample}
                      </Clamp>
                    </div>
                  </DataCell>
                )}
              </DataRow>
            ))}
          </DataList>
        </div>
      )}
    </section>
  );
}
