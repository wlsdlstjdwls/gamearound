// /indie/mine/ads — 내 광고 성과(2026-10-27, docs/기획_인디홍보_상위노출멤버십_2026-10-27.md 4.4 "이 숫자가 없으면 두 번째 결제가 없다").
// 내 글에 걸린 광고마다 노출, 카드 클릭, 클릭률. 인디 게임 광고는 플레이하기 클릭과 새 찜을 "광고 전 같은 기간" 과 나란히 둔다
// (기간 잡는 법은 services/promotions/performance 머리 주석). 대기 중인 광고는 숫자 대신 "시작하면 쌓여요" 를 적는다 — 0 은 "효과 없음" 으로 읽힌다.
import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState } from "@/components/empty-state";
import { BoostStateTag } from "@/components/promo/boost-state-tag";
import { Page, PageHead, sectionCardClass } from "@/components/ui/page";
import { Tag } from "@/components/ui/tag";
import { formatDateTime } from "@/lib/format";
import { stagger } from "@/lib/motion";
import { PROMO_MESSAGES, PROMO_PERFORMANCE_MESSAGES as M, PROMO_SLOT_LABEL, PROMO_SOURCE_LABEL } from "@/lib/promo/messages";
import { ROUTES } from "@/lib/routes";
import { requireUserOrRedirect } from "@/server/auth/guards";
import { listMyBoostPerformance } from "@/server/services/promotions";

export const metadata: Metadata = { title: M.title, robots: { index: false } };

const fmt = (n: number) => n.toLocaleString("ko-KR");
/** 클릭률. 노출이 없으면 대시 — 0% 는 "보였는데 아무도 안 눌렀다" 로 읽힌다 */
const ctr = (clicks: number, views: number) => (views > 0 ? `${((clicks / views) * 100).toFixed(1)}%` : "-");

export default async function IndieAdsPage() {
  const user = await requireUserOrRedirect();
  const rows = await listMyBoostPerformance(user.id);
  const statsLink = (
    <Link href={ROUTES.indieStats} className="tap inline-flex items-center text-[13.5px] font-semibold text-acc hover:underline">
      {M.toStats}
    </Link>
  );

  return (
    <Page gap={20}>
      <PageHead title={M.title} action={statsLink}>
        <p className="text-[14px] text-mut">{M.lead}</p>
      </PageHead>

      {rows.length === 0 ? (
        <EmptyState title={M.empty} description={M.emptyLead} action={{ href: ROUTES.indieStats, label: M.toStats }} />
      ) : (
        <>
          <ul className="flex flex-col gap-3">
            {rows.map((r, i) => {
              const cells: Array<{ label: string; value: string; before?: string }> = [
                { label: M.views, value: fmt(r.views) },
                { label: M.clicks, value: fmt(r.clicks) },
                { label: M.ctr, value: ctr(r.clicks, r.views) },
                ...(r.indie
                  ? [
                      { label: M.plays, value: fmt(r.indie.plays), before: M.before(fmt(r.indie.playsBefore)) },
                      { label: M.likes, value: fmt(r.indie.likes), before: M.before(fmt(r.indie.likesBefore)) },
                    ]
                  : []),
              ];
              return (
                <li key={r.id} className={sectionCardClass("enter-item flex flex-col gap-3")} style={stagger(i)}>
                  <div className="flex flex-col gap-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <BoostStateTag state={r.state} />
                      <Tag tone="acc">{PROMO_SLOT_LABEL[r.slot]}</Tag>
                      <span className="text-[12px] text-dim">{PROMO_SOURCE_LABEL[r.source]}</span>
                    </div>
                    {r.targetHref ? (
                      <Link href={r.targetHref} className="min-w-0 break-words text-[16px] font-bold text-ink hover:text-acc hover:underline">
                        {r.targetTitle}
                      </Link>
                    ) : (
                      <span className="text-[16px] font-bold text-dim">{r.targetTitle}</span>
                    )}
                    <span className="text-[12.5px] text-dim tabular-nums">{PROMO_MESSAGES.period(formatDateTime(r.startsAt), formatDateTime(r.endsAt))}</span>
                  </div>
                  {r.state === "queued" ? (
                    <p className="rounded-xl bg-surface-2 px-4 py-3 text-[13px] text-mut">{M.queued}</p>
                  ) : (
                    <dl className="grid grid-cols-2 gap-x-4 gap-y-3 border-t border-line pt-3 sm:grid-cols-5">
                      {cells.map((c) => (
                        <div key={c.label} className="flex flex-col gap-0.5">
                          <dt className="text-[12.5px] text-dim">{c.label}</dt>
                          <dd className="text-[20px] font-black tabular-nums text-ink">{c.value}</dd>
                          {c.before && <dd className="text-[12px] text-dim tabular-nums">{c.before}</dd>}
                        </div>
                      ))}
                    </dl>
                  )}
                </li>
              );
            })}
          </ul>
          <p className="text-[12.5px] text-dim">{M.howCounted}</p>
        </>
      )}
    </Page>
  );
}
