// /admin/sync-logs — 최근 100건 테이블, ?source= 필터
import type { Metadata } from "next";
import { formatDateTime } from "@/lib/format";
import { ChipLink } from "@/components/ui/chip";
import { isSourceName, listSyncLogs, SOURCES } from "@/server/services/admin";
import { requireRoleOrForbid } from "@/server/auth/guards";
import { cardClass } from "@/components/ui/page";

export const metadata: Metadata = { title: "동기화 로그" };

const STATUS_STYLE: Record<string, string> = {
  ok: "text-acc",
  partial: "text-warn",
  failed: "text-danger",
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
  const logs = await listSyncLogs({ limit: 100, source });

  return (
    <section className="flex flex-col gap-4">
      <header className="flex flex-wrap items-end justify-between gap-2">
        <h1 className="text-2xl font-bold tracking-[-0.03em] text-ink">동기화 로그 <span className="text-[13px] font-normal text-dim">최근 {logs.length}건</span></h1>
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
                  <td className="max-w-md px-3 py-2">
                    {l.errorSample ? <code className="line-clamp-2 break-all font-mono text-[11px] text-mut">{l.errorSample}</code> : <span className="text-dim-2">-</span>}
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
