// /admin — 동기화 상태 대시보드 + 매칭 검수 큐 (§8 MVP 관리자)
import type { Metadata } from "next";
import Link from "next/link";
import { formatDateTime } from "@/lib/format";
import { getSyncOverview, listPendingMatches, type SyncOverviewItem } from "@/server/services/admin";
import { DISABLED_SOURCES, isSource, isSourceEnabled } from "@/server/adapters";
import { requireRoleOrForbid } from "@/server/auth/guards";
import { MatchReviewButtons } from "@/components/admin/match-review-buttons";

export const metadata: Metadata = { title: "관리자 대시보드" };

const STATUS_STYLE: Record<string, string> = {
  ok: "bg-emerald-900/60 text-emerald-300",
  partial: "bg-amber-900/60 text-amber-300",
  failed: "bg-red-900/60 text-red-300",
};

function SourceCard({ item }: { item: SyncOverviewItem }) {
  const l = item.latest;
  const disabledReason = isSource(item.source) && !isSourceEnabled(item.source) ? DISABLED_SOURCES[item.source] : undefined;
  return (
    <div className={`rounded-lg border border-slate-800 bg-slate-900/60 p-4 ${disabledReason ? "opacity-70" : ""}`}>
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">{item.source}</h3>
        {disabledReason ? (
          <span className="rounded bg-slate-800 px-2 py-0.5 text-xs text-slate-400" title={disabledReason}>비활성</span>
        ) : l ? (
          <span className={`rounded px-2 py-0.5 text-xs ${STATUS_STYLE[l.status] ?? ""}`}>{l.status}</span>
        ) : (
          <span className="rounded bg-slate-800 px-2 py-0.5 text-xs text-slate-400">기록 없음</span>
        )}
      </div>
      {l ? (
        <dl className="mt-2 space-y-1 text-xs text-slate-400">
          <div className="flex justify-between"><dt>시작</dt><dd className="text-slate-200">{formatDateTime(l.startedAt)}</dd></div>
          <div className="flex justify-between"><dt>종료</dt><dd className="text-slate-200">{l.finishedAt ? formatDateTime(l.finishedAt) : "실행 중/중단"}</dd></div>
          <div className="flex justify-between"><dt>처리/실패</dt><dd className="text-slate-200">{l.processed ?? 0} / {l.failed ?? 0}</dd></div>
          <div className="flex justify-between"><dt>오늘 실패 실행</dt><dd className={item.failedToday > 0 ? "text-red-300" : "text-slate-200"}>{item.failedToday}회</dd></div>
          {l.errorSample && (
            <div>
              <dt className="mb-0.5">에러 샘플</dt>
              <dd className="line-clamp-3 break-all rounded bg-slate-950 p-1.5 font-mono text-[11px] text-red-200">{l.errorSample.slice(0, 300)}</dd>
            </div>
          )}
        </dl>
      ) : (
        <p className="mt-2 text-xs text-slate-500">아직 실행된 적이 없습니다.</p>
      )}
      {disabledReason && <p className="mt-2 text-xs text-slate-500">{disabledReason}</p>}
    </div>
  );
}

export default async function AdminDashboardPage() {
  await requireRoleOrForbid("admin");
  const [overview, pending] = await Promise.all([getSyncOverview(), listPendingMatches()]);
  const repo = process.env.NEXT_PUBLIC_GITHUB_REPO;

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <header className="flex flex-wrap items-end justify-between gap-2">
          <h1 className="text-xl font-bold">동기화 대시보드</h1>
          <div className="text-sm">
            {repo ? (
              <a
                href={`https://github.com/${repo}/actions`}
                target="_blank"
                rel="noreferrer"
                className="rounded-md border border-slate-700 px-3 py-1.5 hover:border-amber-400 hover:text-amber-300"
              >
                GitHub Actions에서 재실행 ↗
              </a>
            ) : (
              <span className="text-xs text-slate-500">재실행은 GitHub Actions(workflow_dispatch)에서 수동 실행합니다. NEXT_PUBLIC_GITHUB_REPO를 설정하면 링크가 표시됩니다.</span>
            )}
          </div>
        </header>
        <p className="text-xs text-slate-500">
          수집은 GitHub Actions 워커에서만 실행됩니다(§1). 이 화면은 sync_logs를 읽기만 합니다. 검수 대기 매핑: <span className="text-amber-300">{overview.pendingCount}건</span>
        </p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {overview.items.map((item) => (
            <SourceCard key={item.source} item={item} />
          ))}
        </div>
        <Link href="/admin/sync-logs" className="inline-block text-sm text-amber-300 hover:underline">전체 로그 보기 →</Link>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-bold">매칭 검수 큐 <span className="text-sm font-normal text-slate-400">(유사도 0.7~0.9, §4.2)</span></h2>
        {pending.length === 0 ? (
          <p className="rounded-lg border border-dashed border-slate-800 p-6 text-center text-sm text-slate-400">검수 대기 중인 매핑이 없습니다.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-slate-800">
            <table className="w-full text-sm">
              <thead className="bg-slate-900 text-left text-xs text-slate-400">
                <tr>
                  <th className="px-3 py-2">게임</th>
                  <th className="px-3 py-2">소스</th>
                  <th className="px-3 py-2">후보 외부 ID / URL</th>
                  <th className="px-3 py-2">유사도</th>
                  <th className="px-3 py-2">처리</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {pending.map((p) => (
                  <tr key={`${p.gameId}-${p.source}`}>
                    <td className="px-3 py-2">
                      <Link href={`/admin/games/${p.gameId}`} className="hover:text-amber-300">{p.game.titleKo ?? p.game.titleEn}</Link>
                      <span className="ml-1 text-xs text-slate-500">{p.game.titleKo ? `(${p.game.titleEn})` : ""}</span>
                    </td>
                    <td className="px-3 py-2">{p.source}</td>
                    <td className="max-w-xs px-3 py-2">
                      <span className="font-mono text-xs">{p.externalId}</span>
                      {p.url && (
                        <a href={p.url} target="_blank" rel="noreferrer" className="ml-2 break-all text-xs text-amber-300 hover:underline">열기 ↗</a>
                      )}
                    </td>
                    <td className="px-3 py-2">{p.confidence ?? "-"}</td>
                    <td className="px-3 py-2"><MatchReviewButtons gameId={p.gameId} source={p.source} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
