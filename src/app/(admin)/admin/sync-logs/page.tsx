// /admin/sync-logs — 최근 100건 테이블, ?source= 필터
import type { Metadata } from "next";
import { formatDateTime } from "@/lib/format";
import { ChipLink } from "@/components/ui/chip";
import { isSourceName, listSyncLogs, SOURCES } from "@/server/services/admin";
import { requireRoleOrForbid } from "@/server/auth/guards";
import { PageHead, cardClass } from "@/components/ui/page";
import { Clamp } from "@/components/ui/tooltip";

export const metadata: Metadata = { title: "동기화 로그" };

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
  want: { label: "목표 달성", style: "text-ok" },
  budget: { label: "예산 소진", style: "text-warn" },
  "catalog-end": { label: "카탈로그 끝", style: "text-mut" },
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
        <PageHead title="동기화 로그" note={`최근 ${logs.length}건`} />
        <div className="flex flex-wrap gap-1 text-xs">
          <ChipLink href="/admin/sync-logs" active={!source} size="sm">전체</ChipLink>
          {SOURCES.map((s) => (
            <ChipLink key={s} href={`/admin/sync-logs?source=${s}`} active={source === s} size="sm">
              {s}
            </ChipLink>
          ))}
        </div>
      </header>

      {logs.length === 0 ? (
        <p className="rounded-xl border border-dashed border-line-strong bg-surface p-6 text-[13px] text-mut">로그가 없습니다.</p>
      ) : (
        <div className={cardClass("overflow-x-auto")}>
          <table className="w-full text-[13px]">
            <thead className="border-b border-line text-left text-[11.5px] text-dim">
              <tr>
                <th className="px-3 py-2">#</th>
                <th className="px-3 py-2">소스</th>
                <th className="px-3 py-2">상태</th>
                <th className="px-3 py-2">시작</th>
                <th className="px-3 py-2">소요</th>
                <th className="px-3 py-2">처리</th>
                <th className="px-3 py-2">실패</th>
                <th className="px-3 py-2">발견</th>
                <th className="px-3 py-2">에러 샘플</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line-soft">
              {logs.map((l) => (
                <tr key={l.id} className="align-top">
                  <td className="px-3 py-2 text-dim">{l.id}</td>
                  <td className="px-3 py-2">{l.source}</td>
                  <td className={`px-3 py-2 ${STATUS_STYLE[l.status] ?? ""}`}>{l.status}</td>
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
                          {" "}{l.discovery.pages}페이지 | {l.discovery.scanned}건 훑어 신규 {l.discovery.fresh}
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
        </div>
      )}
    </section>
  );
}
