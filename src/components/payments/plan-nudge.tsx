// 요금 안내(/indie/mine/plans)로 이끄는 판(2026-10-28). 사용자: "광고, 멤버십을 메뉴로 따로 두기보다 다른 화면에서 자연스럽게 이어지게".
// 메뉴 칸을 걷고, 만든 사람이 이미 지나가는 자리(등록현황, 내 게임 통계)에 이 판을 둔다.
// 처음엔 연한 파랑 띠였는데 "눈에 너무 안 띈다" 해서 어두운 판(ui/ink-hero)에 손전등 심볼, 흰 알약 단추로 올렸다 —
// 회색 바탕 화면에서 어두운 면은 이것 하나라 눈이 먼저 간다. 값은 가장 싼 단(스파크)부터 말한다 — 들어오는 문턱을 낮춘다.
// 낱말은 "광고" 대신 "알리기, 노출" 이다(같은 날 사용자: "광고란 표현보다 부드럽게"). 보는 사람 쪽 "광고" 표시는 법이 요구해서 그대로다.
import Link from "next/link";
import { INK_CTA, INK_CTA_GHOST, InkHero } from "@/components/ui/ink-hero";
import { BrandSymbol } from "@/components/ui/logo";
import { formatPrice } from "@/lib/currency";
import { PLANS_MESSAGES as M } from "@/lib/payments/plans-messages";
import { getPriceBook } from "@/server/services/pricing";
import { getPricingSettings } from "@/server/services/settings";
import { ROUTES } from "@/lib/routes";

/** 이름과 시작 값은 요금 설정에서 — 처음 결제하는 사람이면 첫 결제 프로모션 값이 걸린 값이다(services/pricing) */
export async function PlanNudge({ userId }: { userId: string }) {
  const [settings, book] = await Promise.all([getPricingSettings(), getPriceBook(userId)]);
  const from = Math.min(book.boost.amount, book.pin.amount);
  return (
    <InkHero label={M.nudgeTitle} className="px-5! py-5! sm:px-6! sm:py-5!">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3.5">
          <span aria-hidden className="hidden shrink-0 sm:block">
            <BrandSymbol size={44} tone="onInk" />
          </span>
          <div className="flex min-w-0 flex-col gap-1">
            <p className="text-[17px] font-extrabold tracking-[-0.03em] sm:text-[19px]">{M.nudgeTitle}</p>
            <p className="text-[13.5px] opacity-80">{M.nudgeLead(settings.copy.single.name, formatPrice(from))}</p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Link href={ROUTES.makerPlans} className={INK_CTA}>
            {M.nudgeCta}
          </Link>
          <Link href={ROUTES.membership} className={INK_CTA_GHOST}>
            {M.nudgeMember(settings.copy.membership.name)}
          </Link>
        </div>
      </div>
    </InkHero>
  );
}
