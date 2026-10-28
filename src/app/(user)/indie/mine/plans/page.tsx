// /indie/mine/plans — 광고, 멤버십(2026-10-28). 사용자: "멤버십이 화면에 안 보인다", "결제하는 게 통계 화면에 있는 게 맞나".
// 통계 화면 머리 단추로만 들어가던 멤버십, 광고 성과, 결제 내역을 메뉴 칸 하나(lib/nav "광고, 멤버십")로 꺼내고, 그 칸의 첫 화면이 이 요금 안내다.
// 위는 요금 카드 셋(components/payments/plan-cards, 순서와 정가 표시의 이유는 그 머리 주석), 아래는 "어디에 걸까요" —
// 공개 중인 내 인디 게임과 홍보 글을 세우고 각각 구매 화면(광고 걸기, 홍보 고정)으로 보낸다. 묶음 고르기는 구매 화면이 맡는다.
// /indie/mine/[id] 는 uuid 라 낱말 "plans" 와 부딪히지 않는다.
import type { Metadata } from "next";
import Link from "next/link";
import { PLAN_PICK_ID, PlanCards } from "@/components/payments/plan-cards";
import { buttonClass } from "@/components/ui/button";
import { Page, PageHead, ROW, ROWS, sectionCardClass } from "@/components/ui/page";
import { writePath } from "@/lib/community/constants";
import { PLANS_MESSAGES as M } from "@/lib/payments/plans-messages";
import { boardPinPath, indieBoostPath, ROUTES } from "@/lib/routes";
import { requireUserOrRedirect } from "@/server/auth/guards";
import { getMyMembership } from "@/server/services/membership";
import { listMyLiveTargets } from "@/server/services/payments";

export const metadata: Metadata = { title: M.title, robots: { index: false } };

type Target = { id: string; title: string };

function TargetGroup({ title, items, href, action, empty }: { title: string; items: Target[]; href: (id: string) => string; action: string; empty: { text: string; href: string; action: string } }) {
  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-[13px] font-semibold text-mut">{title}</h3>
      {items.length === 0 ? (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-surface-2 px-4 py-3 text-[13.5px] text-mut">
          {empty.text}
          <Link href={empty.href} className={buttonClass({ variant: "secondary", size: "sm" })}>
            {empty.action}
          </Link>
        </div>
      ) : (
        <ul className={ROWS}>
          {items.map((t) => (
            <li key={t.id} className={`${ROW} flex min-h-12 items-center justify-between gap-3`}>
              <span className="min-w-0 truncate text-[14.5px] font-semibold text-ink">{t.title}</span>
              <Link href={href(t.id)} className={buttonClass({ variant: "accent", size: "sm" })}>
                {action}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default async function MakerPlansPage() {
  const user = await requireUserOrRedirect();
  // 글 목록을 못 읽으면 빈 칸으로 — 요금 안내는 그대로 선다
  const [membership, indie, promos] = await Promise.all([
    getMyMembership(user.id).catch(() => null),
    listMyLiveTargets(user.id, "indie_post").catch(() => []),
    listMyLiveTargets(user.id, "board_post").catch(() => []),
  ]);
  const live = membership && membership.status !== "ended" ? { credits: membership.usableCredits } : null;

  return (
    <Page gap={20}>
      <PageHead
        title={M.title}
        action={
          <div className="flex flex-wrap items-center gap-1.5">
            <Link href={ROUTES.indieAds} className={buttonClass({ variant: "secondary", size: "sm" })}>
              {M.toAds}
            </Link>
            <Link href={ROUTES.indiePayments} className={buttonClass({ variant: "secondary", size: "sm" })}>
              {M.toHistory}
            </Link>
          </div>
        }
      >
        <p className="text-[14px] text-mut">{M.lead}</p>
      </PageHead>

      <PlanCards membership={live} />

      <section id={PLAN_PICK_ID} className={sectionCardClass("flex scroll-mt-24 flex-col gap-4")}>
        <div className="flex flex-col gap-1">
          <h2 className="text-[17px] font-bold text-ink">{M.pickTitle}</h2>
          <p className="text-[13.5px] text-mut">{M.pickLead}</p>
        </div>
        {live && live.credits > 0 && <p className="rounded-xl bg-acc-soft px-4 py-3 text-[13px] font-semibold text-acc">{M.creditsLeft(live.credits)}</p>}
        <TargetGroup title={M.indieGroup} items={indie} href={indieBoostPath} action={M.boost} empty={{ text: M.noIndie, href: ROUTES.indieNew, action: M.noIndieAction }} />
        <TargetGroup title={M.promoGroup} items={promos} href={boardPinPath} action={M.pin} empty={{ text: M.noPromo, href: writePath("promo"), action: M.noPromoAction }} />
      </section>
    </Page>
  );
}
