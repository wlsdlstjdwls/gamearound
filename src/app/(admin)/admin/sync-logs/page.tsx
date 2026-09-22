// /admin/sync-logs — 실행 로그. 최근 100건 테이블, ?source= 필터.
//
// 수집 현황이 스토어마다 "마지막 한 번" 만 보여 주는 값의 전문이 여기 있다.
// 원값(ok, steam)을 그대로 띄우던 자리를 한글 이름표로 바꿨다 — partial 이 성공인지 실패인지
// 영문으로는 판단이 안 선다. 다만 소스는 로그와 워크플로 이름을 맞대야 해서 원값을 함께 남긴다.
import type { Metadata } from "next";
import { cn } from "@/lib/cn";
import { formatDateTime } from "@/lib/format";
import { ChipLink } from "@/components/ui/chip";
import { isSourceName, listSyncLogs, SOURCES } from "@/server/services/admin";
import { LOG_MESSAGES, SYNC_STATUS_LABEL, sourceLabel } from "@/lib/admin/messages";
import { requireRoleOrForbid } from "@/server/auth/guards";
import { PageHead } from "@/components/ui/page";
import { DataCell, DataHead, DataList, DataRow } from "@/components/admin/data-rows";
import { ROUTES } from "@/lib/routes";
import { Clamp } from "@/components/ui/tooltip";

export const metadata: Metadata = { title: LOG_MESSAGES.title };

const STATUS_STYLE: Record<string, string> = {
  ok: "text-ok",
  partial: "text-warn",
  failed: "text-danger",
};

/**
 * 발견 중단 사유. "예산 소진" 이 이어지면 포화 신호다 — 아는 것만 나오는 구간이 페이지 예산보다 길다는 뜻이라
 * 예산을 올리거나 발견 시작점을 옮겨야 한다. 그래서 이 값만 경고색으로 띄운다.
 */
const DISCOVERY_STOP: Record<string, { label: string; style: string }> = {
  want: { label: LOG_MESSAGES.stopWant, style: "text-ok" },
  budget: { label: LOG_MESSAGES.stopBudget, style: "text-warn" },
  "catalog-end": { label: LOG_MESSAGES.stopCatalogEnd, style: "text-mut" },
};

function durationSec(start: Date, end: Date | null): string {
  if (!end) return "-";
  return `${Math.max(0, Math.round((end.getTime() - start.getTime()) / 1000))}s`;
}

// 칸이 아홉이다. 넓은 화면에서만 표로 서고, 좁은 화면에서는 실행 하나가 카드 한 장이 된다
// (data-rows.tsx 머리 주석). 번호는 줄을 가리키는 값이라 맨 앞에 좁게 둔다.
const LOG_COLS =
  "md:grid-cols-[62px_104px_76px_150px_70px_58px_58px_minmax(0,1.2fr)_minmax(0,2fr)] md:gap-x-3 md:px-3 md:py-2";

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
            cols={LOG_COLS}
            labels={[
              LOG_MESSAGES.colId,
              LOG_MESSAGES.colSource,
              LOG_MESSAGES.colStatus,
              LOG_MESSAGES.colStarted,
              LOG_MESSAGES.colDuration,
              LOG_MESSAGES.colProcessed,
              LOG_MESSAGES.colFailed,
              LOG_MESSAGES.colDiscovery,
              LOG_MESSAGES.colError,
            ]}
          />
          <DataList>
            {logs.map((l) => (
              <DataRow key={l.id} cols={LOG_COLS} align="start">
                <DataCell label={LOG_MESSAGES.colId} className="text-dim">
                  {l.id}
                </DataCell>
                <DataCell label={LOG_MESSAGES.colSource} className="md:whitespace-nowrap">
                  {sourceLabel(l.source)}
                </DataCell>
                <DataCell label={LOG_MESSAGES.colStatus} className={cn("md:whitespace-nowrap", STATUS_STYLE[l.status])}>
                  {SYNC_STATUS_LABEL[l.status] ?? l.status}
                </DataCell>
                <DataCell label={LOG_MESSAGES.colStarted} className="md:whitespace-nowrap">
                  {formatDateTime(l.startedAt)}
                </DataCell>
                <DataCell label={LOG_MESSAGES.colDuration}>{durationSec(l.startedAt, l.finishedAt)}</DataCell>
                <DataCell label={LOG_MESSAGES.colProcessed}>{l.processed ?? 0}</DataCell>
                <DataCell label={LOG_MESSAGES.colFailed} className={(l.failed ?? 0) > 0 ? "font-semibold text-danger" : undefined}>
                  {l.failed ?? 0}
                </DataCell>
                <DataCell label={LOG_MESSAGES.colDiscovery}>
                  {l.discovery ? (
                    <>
                      <span className={DISCOVERY_STOP[l.discovery.stoppedBy]?.style ?? ""}>
                        {DISCOVERY_STOP[l.discovery.stoppedBy]?.label ?? l.discovery.stoppedBy}
                      </span>
                      <span className="text-[11.5px] text-dim">
                        {" "}
                        {LOG_MESSAGES.discoverySummary(l.discovery.pages, l.discovery.scanned, l.discovery.fresh)}
                      </span>
                    </>
                  ) : (
                    <span className="text-dim-2">-</span>
                  )}
                </DataCell>
                <DataCell label={LOG_MESSAGES.colError}>
                  {l.errorSample ? (
                    <code className="font-mono text-[11px] text-mut">
                      <Clamp lines={2} className="break-all">
                        {l.errorSample}
                      </Clamp>
                    </code>
                  ) : (
                    <span className="text-dim-2">-</span>
                  )}
                </DataCell>
              </DataRow>
            ))}
          </DataList>
        </div>
      )}
    </section>
  );
}
