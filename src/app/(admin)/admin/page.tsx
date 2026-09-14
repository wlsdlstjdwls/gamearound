// /admin — 동기화 상태 대시보드 + 매칭 검수 큐 (§8 MVP 관리자). 읽기 전용 — 재실행은 GitHub Actions.
import type { Metadata } from "next";
import Link from "next/link";
import { MatchReviewButtons } from "@/components/admin/match-review-buttons";
import { Card, SectionHead } from "@/components/ui/page";
import { buttonClass } from "@/components/ui/button";
import { formatDateTime } from "@/lib/format";
import { getSyncOverview, listPendingMatches, type SyncOverviewItem } from "@/server/services/admin";
import { getDisabledReason, isSource } from "@/server/adapters";
import { requireRoleOrForbid } from "@/server/auth/guards";

export const metadata: Metadata = { title: "관리자 대시보드" };

const STATUS_STYLE: Record<string, string> = {
  ok: "bg-acc-soft text-acc",
  partial: "bg-warn-soft text-warn",
  failed: "bg-danger-soft text-danger",
};
const BADGE = "rounded-[6px] px-2 py-0.5 text-[11.5px] font-semibold";
const QUEUE_COLS = "grid grid-cols-[minmax(0,2fr)_90px_minmax(0,1.6fr)_74px_132px] gap-x-3 px-4 py-[13px]";

function Metric({ label, value, alert = false }: { label: string; value: string; alert?: boolean }) {
  return (
    <div className="flex justify-between text-[12px] text-mut">
      <dt>{label}</dt>
      <dd className={alert ? "font-semibold text-danger" : "text-ink"}>{value}</dd>
    </div>
  );
}

function SourceCard({ item }: { item: SyncOverviewItem }) {
  const l = item.latest;
  const disabledReason = isSource(item.source) ? getDisabledReason(item.source) : undefined;

  return (
    <div className={`flex flex-col gap-2.5 rounded-xl border border-line bg-surface p-4 ${disabledReason ? "opacity-60" : ""}`}>
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-[13.5px] font-bold text-ink">{item.source}</h3>
        {disabledReason ? (
          <span className={`${BADGE} bg-surface-2 text-mut`} title={disabledReason}>
            비활성
          </span>
        ) : l ? (
          <span className={`${BADGE} ${STATUS_STYLE[l.status] ?? "bg-surface-2 text-mut"}`}>{l.status}</span>
        ) : (
          <span className={`${BADGE} bg-surface-2 text-mut`}>기록 없음</span>
        )}
      </div>

      {l ? (
        <dl className="flex flex-col gap-1">
          <Metric label="종료" value={l.finishedAt ? formatDateTime(l.finishedAt) : "실행 중/중단"} />
          <Metric label="처리 · 실패" value={`${l.processed ?? 0} · ${l.failed ?? 0}`} />
          <Metric label="오늘 실패" value={`${item.failedToday}회`} alert={item.failedToday > 0} />
          {l.errorSample && (
            <div className="mt-1">
              <dt className="mb-1 text-[11.5px] text-dim">에러 샘플</dt>
              <dd className="line-clamp-3 break-all rounded-[7px] bg-surface-4 px-2.5 py-2 font-mono text-[11px] leading-[1.55] text-mut">
                {l.errorSample.slice(0, 300)}
              </dd>
            </div>
          )}
        </dl>
      ) : (
        <p className="text-[12px] text-dim">아직 실행된 적이 없습니다.</p>
      )}

      {disabledReason && <p className="text-[11.5px] text-dim">{disabledReason}</p>}
    </div>
  );
}

export default async function AdminDashboardPage() {
  await requireRoleOrForbid("admin");
  const [overview, pending] = await Promise.all([getSyncOverview(), listPendingMatches()]);
  const repo = process.env.NEXT_PUBLIC_GITHUB_REPO;

  return (
    <>
      <section className="flex flex-col gap-4">
        <header className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
          <div>
            <h1 className="text-2xl font-bold tracking-[-0.03em] text-ink">동기화 대시보드</h1>
            <p className="mt-1 max-w-[560px] text-[13px] text-mut">
              수집은 GitHub Actions 워커에서만 실행됩니다. 이 화면은 로그를 읽기만 합니다.
            </p>
          </div>
          {repo ? (
            <a href={`https://github.com/${repo}/actions`} target="_blank" rel="noreferrer" className={buttonClass({ variant: "secondary" })}>
              Actions에서 재실행 ↗
            </a>
          ) : (
            <span className="max-w-[320px] text-[11.5px] text-dim">
              NEXT_PUBLIC_GITHUB_REPO를 설정하면 재실행 링크가 표시됩니다.
            </span>
          )}
        </header>

        <div className="grid grid-cols-[repeat(auto-fit,minmax(230px,1fr))] gap-3.5">
          {overview.items.map((item) => (
            <SourceCard key={item.source} item={item} />
          ))}
        </div>

        <Link href="/admin/sync-logs" className="text-[12.5px] text-acc hover:underline">
          전체 로그 보기 →
        </Link>
      </section>

      <section className="flex flex-col gap-3">
        <SectionHead title="매칭 검수 큐" note={`유사도 0.7~0.9 · ${pending.length}건`} />
        {pending.length === 0 ? (
          <p className="rounded-xl border border-dashed border-line-strong bg-surface p-6 text-[13px] text-mut">
            검수 대기 중인 매핑이 없습니다.
          </p>
        ) : (
          <Card className="overflow-x-auto">
            <div className={`${QUEUE_COLS} min-w-[720px] border-b border-line text-[11.5px] text-dim`}>
              <span>게임</span>
              <span>소스</span>
              <span>후보 외부 ID / URL</span>
              <span>유사도</span>
              <span>처리</span>
            </div>
            <ul className="min-w-[720px] divide-y divide-line-soft">
              {pending.map((p) => (
                <li key={`${p.gameId}-${p.source}`} className={`${QUEUE_COLS} items-center text-[13px] text-ink`}>
                  <span className="min-w-0 truncate">
                    <Link href={`/admin/games/${p.gameId}`} className="font-medium hover:text-acc">
                      {p.game.titleKo ?? p.game.titleEn}
                    </Link>
                    {p.game.titleKo && <span className="ml-1 text-[11.5px] text-dim">({p.game.titleEn})</span>}
                  </span>
                  <span className="text-mut">{p.source}</span>
                  <span className="min-w-0 truncate font-mono text-[12px] text-mut">
                    {p.externalId}
                    {p.url && (
                      <a href={p.url} target="_blank" rel="noreferrer" className="ml-2 font-sans text-acc hover:underline">
                        열기 ↗
                      </a>
                    )}
                  </span>
                  <span className="text-mut">{p.confidence ?? "-"}</span>
                  <MatchReviewButtons gameId={p.gameId} source={p.source} />
                </li>
              ))}
            </ul>
          </Card>
        )}
      </section>
    </>
  );
}
