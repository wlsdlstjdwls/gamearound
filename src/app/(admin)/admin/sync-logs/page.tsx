// /admin/sync-logs — 실행 로그. 최근 100건 테이블, ?source= 필터.
//
// 수집 현황이 스토어마다 "마지막 한 번" 만 보여 주는 값의 전문이 여기 있다.
// 원값(ok, steam)을 그대로 띄우던 자리를 한글 이름표로 바꿨다 — partial 이 성공인지 실패인지
// 영문으로는 판단이 안 선다. 다만 소스는 로그와 워크플로 이름을 맞대야 해서 원값을 함께 남긴다.
import type { Metadata } from "next";
import { formatDateTime } from "@/lib/format";
import { ChipLink } from "@/components/ui/chip";
import { isSourceName, listSyncLogs, SOURCES } from "@/server/services/admin";
import { LOG_MESSAGES, SYNC_STATUS_LABEL, sourceLabel } from "@/lib/admin/messages";
import { requireRoleOrForbid } from "@/server/auth/guards";
import { PageHead } from "@/components/ui/page";
import { TableScroll } from "@/components/admin/table-scroll";
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
        // 칸이 아홉이다 — 좁은 화면에서 줄이면 한 칸이 30px 이 되어 시각도 소스도 세로로 끊긴다.
        // 이 표는 읽기만 하는 자리라 가로로 미는 것이 맞다(판정하는 표는 queue.tsx 를 쓴다)
        <TableScroll minWidth={980}>
          <table className="w-full text-[13px]">
            <thead className="border-b border-line text-left text-[11.5px] text-dim">
              <tr>
                <th className="px-3 py-2">{LOG_MESSAGES.colId}</th>
                <th className="px-3 py-2">{LOG_MESSAGES.colSource}</th>
                <th className="px-3 py-2">{LOG_MESSAGES.colStatus}</th>
                <th className="px-3 py-2">{LOG_MESSAGES.colStarted}</th>
                <th className="px-3 py-2">{LOG_MESSAGES.colDuration}</th>
                <th className="px-3 py-2">{LOG_MESSAGES.colProcessed}</th>
                <th className="px-3 py-2">{LOG_MESSAGES.colFailed}</th>
                <th className="px-3 py-2">{LOG_MESSAGES.colDiscovery}</th>
                <th className="px-3 py-2">{LOG_MESSAGES.colError}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line-soft">
              {logs.map((l) => (
                <tr key={l.id} className="align-top">
                  <td className="px-3 py-2 text-dim">{l.id}</td>
                  <td className="whitespace-nowrap px-3 py-2">{sourceLabel(l.source)}</td>
                  <td className={`whitespace-nowrap px-3 py-2 ${STATUS_STYLE[l.status] ?? ""}`}>
                    {SYNC_STATUS_LABEL[l.status] ?? l.status}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2">{formatDateTime(l.startedAt)}</td>
                  <td className="px-3 py-2">{durationSec(l.startedAt, l.finishedAt)}</td>
                  <td className="px-3 py-2">{l.processed ?? 0}</td>
                  <td className={`px-3 py-2 ${(l.failed ?? 0) > 0 ? "font-semibold text-danger" : ""}`}>{l.failed ?? 0}</td>
                  <td className="whitespace-nowrap px-3 py-2">
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
                  </td>
                  <td className="max-w-md px-3 py-2">
                    {l.errorSample ? (
                      <code className="font-mono text-[11px] text-mut">
                        <Clamp lines={2} className="break-all">
                          {l.errorSample}
                        </Clamp>
                      </code>
                    ) : (
                      <span className="text-dim-2">-</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableScroll>
      )}
    </section>
  );
}
