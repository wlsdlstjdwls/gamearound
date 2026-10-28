// 요금 카드 셋(2026-10-28, /indie/mine/plans).
//
// 순서는 싼 것부터 — 낱개 → 묶음(추천) → 멤버십. 사용자(10-28 셋째 요청): "왼쪽에서 오른쪽으로 갈수록 비싼 대신 혜택도 많게".
// 윗단 카드는 아랫단의 모든 것을 품는다. 그래서 윗단은 "낱개에 더해", "묶음에 더해" 머리 아래에 **더해지는 것만** 보라 "+" 줄로 적는다 —
// 같은 줄을 카드마다 되풀이하면 무엇이 달라지는지가 묻힌다(사용자: "한 단계 높을수록 바뀌는 점을 강조해야지, 티가 안 난다").
// 가운데 묶음만 테두리로 띄워 주로 팔 상품을 가리킨다.
//
// 그은 정가는 근거가 있는 값만 쓴다: 묶음은 낱개 둘의 합(BUNDLE_LIST_PRICE). 멤버십 이용권 환산(13,800원)은 멤버십 값보다 낮아
// 정가로 긋지 않는다 — 긋는 순간 없는 정가가 된다(표시광고법).
// 지금 받는 것(바로 노출, 이용권 즉시 채움)을 값 바로 아래 둔다 — 나중 이득보다 지금 이득을 크게 느낀다(현재 편향).
// 구매 단추는 components/payments/plan-cta — 카드에서 바로 결제 화면으로 간다.
import Link from "next/link";
import { PlanCta, type PlanCtaGroup } from "@/components/payments/plan-cta";
import { buttonClass } from "@/components/ui/button";
import { CheckIcon, PlusIcon } from "@/components/ui/icons";
import { sectionCardClass } from "@/components/ui/page";
import { Tag } from "@/components/ui/tag";
import { formatPrice } from "@/lib/currency";
import { DEFAULT_PLAN, MEMBERSHIP_PLANS, MONTH_DAYS_APPROX } from "@/lib/membership/plan";
import { BUNDLE_MESSAGES as B } from "@/lib/payments/messages";
import { PLANS_MESSAGES as M } from "@/lib/payments/plans-messages";
import { BUNDLE_DISCOUNT_RATE, BUNDLE_LIST_PRICE, BUNDLE_SAVING, perDay, PRODUCTS } from "@/lib/payments/products";
import { ROUTES } from "@/lib/routes";

/** "이름: 설명" 을 이름만 굵게. 쌍점이 없으면 통째로 */
function Labeled({ text }: { text: string }) {
  const at = text.indexOf(": ");
  if (at < 0) return <>{text}</>;
  return (
    <>
      <b className="font-bold">{text.slice(0, at)}</b> {text.slice(at + 2)}
    </>
  );
}

/** 이 단에 든 것(회색 체크) */
function Included({ lines }: { lines: readonly string[] }) {
  return (
    <ul className="flex flex-col gap-2 text-[13.5px] leading-[1.55] text-ink-2">
      {lines.map((line) => (
        <li key={line} className="flex gap-2">
          <CheckIcon size={15} className="mt-[3px] shrink-0 text-mut" />
          <span>
            <Labeled text={line} />
          </span>
        </li>
      ))}
    </ul>
  );
}

/** 아랫단에 더해지는 것(보라 "+"). base: "낱개에 더해" 같은 머리 */
function Adds({ base, lines }: { base: string; lines: readonly string[] }) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-[12.5px] font-semibold text-mut">{base}</p>
      <ul className="flex flex-col gap-2 text-[13.5px] leading-[1.55] text-ink">
        {lines.map((line) => (
          <li key={line} className="flex gap-2">
            <span aria-hidden className="mt-[2px] flex size-[18px] shrink-0 items-center justify-center rounded-full bg-acc text-on-ink">
              <PlusIcon size={12} />
            </span>
            <span className="font-semibold">
              <Labeled text={line} />
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** 이름, 딱지, 한 줄 정의 */
function Head({ name, tag, summary }: { name: string; tag?: React.ReactNode; summary: string }) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-[17px] font-bold text-ink">{name}</h2>
        {tag}
      </div>
      <p className="text-[14px] font-semibold text-ink-2">{summary}</p>
    </div>
  );
}

/** 값 바로 아래 "지금 받는 것" 한 줄 */
function Now({ children }: { children: React.ReactNode }) {
  return <p className="rounded-xl bg-acc-soft px-3 py-2 text-[13px] font-semibold text-acc">{children}</p>;
}

const BIG = "text-[28px] font-black leading-none tabular-nums text-ink";
/** 값 칸 높이를 세 카드가 맞춘다 — 묶음만 그은 정가와 아끼는 금액 두 줄이 더 있어, 맞추지 않으면 아래 줄이 카드마다 어긋난다 */
const PRICE_BOX = "flex flex-col gap-1 lg:min-h-[92px]";

type Props = {
  /** 이용 중이면 남은 이용권. 없으면 null */
  membership: { credits: number } | null;
  /** 카드 단추가 고를 글. 낱개는 둘 다, 묶음은 인디 게임만(묶음 주문의 주 대상이 인디 게임이다) */
  single: PlanCtaGroup[];
  bundle: PlanCtaGroup[];
  /** 홍보 글이 없어 묶음을 살 수 없나 */
  bundleNeedsPromo: boolean;
};

export function PlanCards({ membership, single, bundle, bundleNeedsPromo }: Props) {
  const plan = MEMBERSHIP_PLANS[DEFAULT_PLAN];
  const empty = { href: ROUTES.indieNew, action: M.noIndieAction };

  return (
    <div className="grid items-stretch gap-3 lg:grid-cols-3">
      <section className={sectionCardClass("flex flex-col gap-4")}>
        <Head name={M.singleName} summary={M.singleSummary} />
        <div className={PRICE_BOX}>
          <span className={BIG}>{formatPrice(PRODUCTS.boost_indie_7d.amount)}</span>
        </div>
        <Now>{M.adNow}</Now>
        <Included lines={M.singleIncludes} />
        <p className="text-[13px] font-semibold text-danger">{M.singleHint(formatPrice(BUNDLE_SAVING))}</p>
        <PlanCta label={M.singleCta} variant="secondary" groups={single} empty={empty} />
      </section>

      <section className={sectionCardClass("flex flex-col gap-4 ring-2 ring-acc")}>
        <Head name={M.bundleName} summary={M.bundleSummary} tag={<Tag tone="acc">{M.bundleTag}</Tag>} />
        <div className={PRICE_BOX}>
          <span className="flex flex-wrap items-center gap-2">
            <s className="text-[15px] font-medium tabular-nums text-dim">
              <span className="sr-only">{B.listPrice} </span>
              {formatPrice(BUNDLE_LIST_PRICE)}
            </s>
            <Tag tone="hot">{M.rate(BUNDLE_DISCOUNT_RATE)}</Tag>
          </span>
          <span className={BIG}>{formatPrice(PRODUCTS.bundle_7d.amount)}</span>
          <span className="text-[13px] font-semibold text-danger">{M.saving(formatPrice(BUNDLE_SAVING))}</span>
        </div>
        <Now>{M.adNow}</Now>
        <Adds base={M.bundleBase} lines={M.bundleAdds(formatPrice(BUNDLE_SAVING))} />
        <PlanCta label={M.bundleCta} variant="accent" groups={bundle} empty={empty} note={bundleNeedsPromo ? M.bundleNeedsPromo : undefined} />
      </section>

      <section className={sectionCardClass("flex flex-col gap-4")}>
        <Head name={M.membershipName} summary={M.membershipSummary} tag={membership ? <Tag tone="ok">{M.membershipActive}</Tag> : <Tag tone="outline">{M.membershipTag}</Tag>} />
        <div className={PRICE_BOX}>
          <span className={BIG}>
            <span className="mr-1 text-[13px] font-semibold text-mut">{M.perMonth}</span>
            {formatPrice(plan.amount)}
          </span>
          <span className="text-[13px] text-mut">{M.perDayApprox(formatPrice(perDay(plan.amount, MONTH_DAYS_APPROX)))}</span>
        </div>
        <Now>{membership ? M.membershipCredits(membership.credits) : M.membershipNow}</Now>
        <Adds base={M.membershipBase} lines={[M.membershipCreditsAdd(plan.boostCredits), ...M.memberPerks]} />
        <Link href={ROUTES.membership} className={buttonClass({ variant: membership ? "secondary" : "primary", fullWidth: true, className: "mt-auto" })}>
          {membership ? M.membershipManage : M.membershipStart}
        </Link>
      </section>
    </div>
  );
}
