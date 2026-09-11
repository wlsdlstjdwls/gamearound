// /admin/sync-logs — 최근 100건 테이블, ?source= 필터
import type { Metadata } from "next";
import Link from "next/link";
import { formatDateTime } from "@/lib/format";
import { isSourceName, listSyncLogs, SOURCES } from "@/server/services/admin";
import { requireAdmin } from "@/server/services/users";

export const metadata: Metadata = { title: "동기화 로그" };

const STATUS_STYLE: Record<string, string> = {
  ok: "text-emerald-300",
  partial: "text-amber-300",
  failed: "text-red-300",
};

function durationSec(start: Date, end: Date | null): string {
  if (!end) return "-";
  return `${Math.max(0, Math.round((end.getTime() - start.getTime()) / 1000))}s`;
}

export default async function SyncLogsPage({ searchParams }: { searchParams: Promise<{ source?: string | string[] }> }) {
  await requireAdmin();
  const sp = await searchParams;
  const raw = typeof sp.source === "string" ? sp.source : undefined;
  const source = isSourceName(raw) ? raw : undefined;
  const logs = await listSyncLogs({ limit: 100, source });

  return (
    <section className="space-y-4">
      <header className="flex flex-wrap items-end justify-between gap-2">
        <h1 className="text-xl font-bold">동기화 로그 <span className="text-sm font-normal text-slate-400">최근 {logs.length}건</span></h1>
        <div className="flex flex-wrap gap-1 text-xs">
          <Link href="/admin/sync-logs" className={`rounded-md border px-2 py-1 ${!source ? "border-amber-400 text-amber-300" : "border-slate-700 text-slate-300 hover:border-slate-500"}`}>전체</Link>
          {SOURCES.map((s) => (
            <Link
              key={s}
              href={`/admin/sync-logs?source=${s}`}
              className={`rounded-md border px-2 py-1 ${source === s ? "border-amber-400 text-amber-300" : "border-slate-700 text-slate-300 hover:border-slate-500"}`}
            >
              {s}
            </Link>
          ))}
        </div>
      </header>

      {logs.length === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-800 p-6 text-center text-sm text-slate-400">로그가 없습니다.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-800">
          <table className="w-full text-sm">
            <thead className="bg-slate-900 text-left text-xs text-slate-400">
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
            <tbody className="divide-y divide-slate-800">
              {logs.map((l) => (
                <tr key={l.id} className="align-top">
                  <td className="px-3 py-2 text-slate-500">{l.id}</td>
                  <td className="px-3 py-2">{l.source}</td>
                  <td className={`px-3 py-2 ${STATUS_STYLE[l.status] ?? ""}`}>{l.status}</td>
                  <td className="whitespace-nowrap px-3 py-2">{formatDateTime(l.startedAt)}</td>
                  <td className="px-3 py-2">{durationSec(l.startedAt, l.finishedAt)}</td>
                  <td className="px-3 py-2">{l.processed ?? 0}</td>
                  <td className={`px-3 py-2 ${(l.failed ?? 0) > 0 ? "text-red-300" : ""}`}>{l.failed ?? 0}</td>
                  <td className="max-w-md px-3 py-2">
                    {l.errorSample ? <code className="line-clamp-2 break-all text-[11px] text-red-200">{l.errorSample}</code> : <span className="text-slate-600">-</span>}
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
