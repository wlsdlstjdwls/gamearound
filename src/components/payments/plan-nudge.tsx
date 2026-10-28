// 요금 안내(/indie/mine/plans)로 이끄는 한 줄 판(2026-10-28). 사용자: "광고, 멤버십을 메뉴로 따로 두기보다 다른 화면에서 자연스럽게 이어지게".
// 메뉴 칸을 걷고, 만든 사람이 이미 지나가는 자리(등록현황, 내 게임 통계, 내 게임 상세)에 이 판을 둔다.
// 값은 가장 싼 단(스파크)부터 말한다 — 들어오는 문턱을 낮춘다. 판 전체가 아니라 단추만 링크다(판 안 다른 글을 고를 수 있게).
// boostHref 를 주면 그 게임 결제 화면으로 가는 단추를 하나 더 둔다(내 게임 상세처럼 대상이 정해진 자리).
import Link from "next/link";
import { buttonClass } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { formatPrice } from "@/lib/currency";
import { PLANS_MESSAGES as M } from "@/lib/payments/plans-messages";
import { PRODUCTS } from "@/lib/payments/products";
import { ROUTES } from "@/lib/routes";

export function PlanNudge({ boostHref, className }: { boostHref?: string; className?: string }) {
  return (
    <div className={cn("flex flex-col gap-3 rounded-[var(--radius-panel)] bg-acc-soft px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-5", className)}>
      <div className="flex min-w-0 flex-col gap-0.5">
        <p className="text-[14.5px] font-bold text-ink">{M.nudgeTitle}</p>
        <p className="text-[13px] text-ink-2">{M.nudgeLead(formatPrice(PRODUCTS.boost_indie_7d.amount))}</p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {boostHref && (
          <Link href={boostHref} className={buttonClass({ variant: "accent", size: "sm" })}>
            {M.nudgeBoost}
          </Link>
        )}
        <Link href={ROUTES.makerPlans} className={buttonClass({ variant: boostHref ? "secondary" : "accent", size: "sm" })}>
          {M.nudgeCta}
        </Link>
      </div>
    </div>
  );
}
