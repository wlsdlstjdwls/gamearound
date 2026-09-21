// /admin — 수집 현황. 스토어별 마지막 실행이 어떻게 끝났는지만 본다. 읽기 전용 — 재실행은 GitHub Actions.
//
// 앞서 이 화면에는 매칭 검수 큐가 함께 살았다. 뗀 이유는 둘이 하는 일이 다르기 때문이다 —
// 현황은 읽고 지나가는 자리고 큐는 눌러야 줄이 줄어드는 자리다. 섞여 있으면 메뉴가
// "남은 일" 배지를 붙일 자리를 못 주고, 관리자는 큐가 어디 있는지 매번 대시보드를 뒤져야 했다.
import type { Metadata } from "next";
import Link from "next/link";
import { buttonClass } from "@/components/ui/button";
import { formatDateTime } from "@/lib/format";
import { SYNC_MESSAGES, SYNC_STATUS_LABEL, sourceLabel } from "@/lib/admin/messages";
import { ROUTES } from "@/lib/routes";
import { getSyncOverview, type SyncOverviewItem } from "@/server/services/admin";
import { getDisabledReason, isSource } from "@/server/adapters";
import { requireRoleOrForbid } from "@/server/auth/guards";
import { PageHead } from "@/components/ui/page";
import { Clamp } from "@/components/ui/tooltip";

/** 카드에 노출할 에러 샘플 길이. 전문은 실행 로그 화면에서 본다 */
const ERROR_SAMPLE_PREVIEW_LEN = 300;

export const metadata: Metadata = { title: SYNC_MESSAGES.title };

const STATUS_STYLE: Record<string, string> = {
  ok: "bg-ok-soft text-ok",
  partial: "bg-warn-soft text-warn",
  failed: "bg-danger-soft text-danger",
};
const BADGE = "rounded-[6px] px-2 py-0.5 text-[11.5px] font-semibold";

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
    // 소스 하나가 한 칸이다. 판 대신 위쪽 헤어라인 한 줄로 칸을 표시한다 —
    // 소스가 여덟이라 판을 세우면 관리자 화면이 상자 여덟 개로 읽히고, 정작 볼 값(빨간 실패 수)이 묻힌다
    <div className={`flex flex-col gap-2.5 border-t border-line pt-3.5 ${disabledReason ? "opacity-60" : ""}`}>
      <div className="flex items-center justify-between gap-2">
        {/* 스토어 이름은 한글로 띄우고, 로그를 맞대 볼 때 쓰는 원값은 그 밑에 작게 남긴다 */}
        <h3 className="min-w-0 text-[13.5px] font-bold text-ink">
          <Clamp>{sourceLabel(item.source)}</Clamp>
          <span className="mt-0.5 block font-mono text-[11px] font-normal text-dim">{item.source}</span>
        </h3>
        {disabledReason ? (
          <span className={`${BADGE} shrink-0 bg-surface-2 text-mut`}>{SYNC_MESSAGES.disabled}</span>
        ) : l ? (
          <span className={`${BADGE} shrink-0 ${STATUS_STYLE[l.status] ?? "bg-surface-2 text-mut"}`}>
            {SYNC_STATUS_LABEL[l.status] ?? l.status}
          </span>
        ) : (
          <span className={`${BADGE} shrink-0 bg-surface-2 text-mut`}>{SYNC_MESSAGES.noRun}</span>
        )}
      </div>

      {l ? (
        <dl className="flex flex-col gap-1">
          <Metric label={SYNC_MESSAGES.finishedAt} value={l.finishedAt ? formatDateTime(l.finishedAt) : SYNC_MESSAGES.running} />
          <Metric label={SYNC_MESSAGES.processedFailed} value={`${l.processed ?? 0} | ${l.failed ?? 0}`} />
          <Metric label={SYNC_MESSAGES.failedToday} value={`${item.failedToday}회`} alert={item.failedToday > 0} />
          {l.errorSample && (
            <div className="mt-1">
              <dt className="mb-1 text-[11.5px] text-dim">{SYNC_MESSAGES.errorSample}</dt>
              <dd className="rounded-[7px] bg-surface-4 px-2.5 py-2 font-mono text-[11px] leading-[1.55] text-mut">
                <Clamp lines={3} className="break-all">
                  {l.errorSample.slice(0, ERROR_SAMPLE_PREVIEW_LEN)}
                </Clamp>
              </dd>
            </div>
          )}
        </dl>
      ) : (
        <p className="text-[12px] text-dim">{SYNC_MESSAGES.neverRan}</p>
      )}

      {/* 쉬는 까닭은 접어 두지 않는다 — 왜 안 도는지 모르면 고장으로 읽는다 */}
      {disabledReason && <p className="text-[11.5px] text-dim">{disabledReason}</p>}
    </div>
  );
}

export default async function AdminSyncOverviewPage() {
  await requireRoleOrForbid("admin");
  const overview = await getSyncOverview();
  const repo = process.env.NEXT_PUBLIC_GITHUB_REPO;

  return (
    <section className="flex flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
        <div>
          <PageHead title={SYNC_MESSAGES.title} />
          <p className="mt-1.5 max-w-[620px] text-[13.5px] leading-[1.7] text-mut">{SYNC_MESSAGES.lead}</p>
        </div>
        {repo ? (
          <a href={`https://github.com/${repo}/actions`} target="_blank" rel="noreferrer" className={buttonClass({ variant: "secondary" })}>
            {SYNC_MESSAGES.rerun}
            <span className="sr-only"> (새 창에서 열림)</span>
          </a>
        ) : (
          <span className="max-w-[320px] text-[11.5px] text-dim">{SYNC_MESSAGES.rerunHint}</span>
        )}
      </header>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(230px,100%),1fr))] gap-x-8 gap-y-5">
        {overview.items.map((item) => (
          <SourceCard key={item.source} item={item} />
        ))}
      </div>

      <Link href={ROUTES.adminSyncLogs} className="text-[13px] text-acc hover:underline">
        {SYNC_MESSAGES.allLogs}
      </Link>
    </section>
  );
}
