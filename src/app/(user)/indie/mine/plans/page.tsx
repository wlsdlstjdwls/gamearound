// /indie/mine/plans — 광고, 멤버십(2026-10-28). 사용자: "멤버십이 화면에 안 보인다", "결제하는 게 통계 화면에 있는 게 맞나".
// 멤버십, 광고 성과, 결제 내역을 이 요금 안내 한 화면으로 모은다. 메뉴 칸은 두지 않는다(같은 날 사용자: "다른 화면에서 자연스럽게") —
// 등록현황, 내 게임 통계, 내 게임 상세의 안내 판과 광고 걸기 단추가 입구다(payments/plan-nudge).
// 위는 요금 카드 셋(components/payments/plan-cards, 순서와 정가 표시의 이유는 그 머리 주석), 아래는 광고가 보이는 자리(plan-spots).
// 카드 단추가 곧 구매다 — 공개 중인 내 글을 여기서 읽어 카드에 넘기고, 단추가 그 글의 결제 화면으로 바로 보낸다(plan-cta).
// 예전에는 아래 "어디에 걸까요" 판까지 내려가 다시 눌러야 했다(사용자: "어디에 걸지 고르기 → 광고 걸기, 불편하다").
// /indie/mine/[id] 는 uuid 라 낱말 "plans" 와 부딪히지 않는다.
import type { Metadata } from "next";
import Link from "next/link";
import { PlanCards } from "@/components/payments/plan-cards";
import type { PlanCtaGroup } from "@/components/payments/plan-cta";
import { PlanSpots } from "@/components/payments/plan-spots";
import { buttonClass } from "@/components/ui/button";
import { Page, PageHead } from "@/components/ui/page";
import { PLANS_MESSAGES as M } from "@/lib/payments/plans-messages";
import { boardPinPath, indieBoostPath, ROUTES } from "@/lib/routes";
import { requireUserOrRedirect } from "@/server/auth/guards";
import { getMyMembership } from "@/server/services/membership";
import { listMyLiveTargets } from "@/server/services/payments";

export const metadata: Metadata = { title: M.title, robots: { index: false } };

type Target = { id: string; title: string };

function group(title: string, items: Target[], href: (id: string) => string): PlanCtaGroup {
  return { title, items: items.map((t) => ({ ...t, href: href(t.id) })) };
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

      <PlanCards
        membership={live}
        single={[group(M.indieGroup, indie, (id) => indieBoostPath(id, "single")), group(M.promoGroup, promos, (id) => boardPinPath(id, "single"))]}
        bundle={[group(M.indieGroup, indie, (id) => indieBoostPath(id, "bundle"))]}
        bundleNeedsPromo={indie.length > 0 && promos.length === 0}
      />
      <PlanSpots />
    </Page>
  );
}
