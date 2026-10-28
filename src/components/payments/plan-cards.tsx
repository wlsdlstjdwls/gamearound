// 요금 카드 셋(2026-10-28, /indie/mine/plans). 사용자: "먼저 비싼 거 보여 주고 우리가 실제로 주로 팔 걸 보여 주는 식, 정가 긋고 할인 강조".
//
// 순서가 설계다 — 멤버십(월 19,900원) → 묶음(추천) → 낱개. 맨 앞의 큰 값이 기준점(앵커)이 되어 가운데 묶음 9,900원이 가볍게 읽히고,
// 낱개 6,900원은 "3,900원만 더 내면 둘" 이라는 비교 대상이 된다. 넓은 화면은 세 칸이 한 줄이라 가운데 묶음만 테두리로 띄운다.
// 그은 정가는 근거가 있는 값만 쓴다: 묶음은 낱개 둘의 합(BUNDLE_LIST_PRICE). 멤버십 이용권 환산(13,800원)은 멤버십 값보다 낮아
// 정가로 긋지 않고 "따로 사면" 으로 쌓아 보인다 — 긋는 순간 없는 정가가 된다.
// 지금 받는 것(바로 노출, 이용권 즉시 채움)을 값 바로 아래 둔다 — 나중 이득보다 지금 이득을 크게 느낀다(현재 편향).
// 카드는 위에서부터 이름, 한 줄 정의, 값, 지금 받는 것, 구성 순이다(10-28 둘째 요청: "정확히 뭘 하는 건지 보기 어렵다").
// 구성 줄은 "이름: 무엇이 어디에" 로 적고 이름만 굵게 — 훑어볼 때 이름만 읽어도 무엇이 들었는지 보인다.
import Link from "next/link";
import { buttonClass } from "@/components/ui/button";
import { sectionCardClass } from "@/components/ui/page";
import { Tag } from "@/components/ui/tag";
import { formatPrice } from "@/lib/currency";
import { creditsListValue, DEFAULT_PLAN, MEMBERSHIP_PLANS, MONTH_DAYS_APPROX } from "@/lib/membership/plan";
import { BUNDLE_MESSAGES as B } from "@/lib/payments/messages";
import { PLANS_MESSAGES as M } from "@/lib/payments/plans-messages";
import { BUNDLE_DISCOUNT_RATE, BUNDLE_LIST_PRICE, BUNDLE_SAVING, perDay, PRODUCTS } from "@/lib/payments/products";
import { ROUTES } from "@/lib/routes";

/** 아래 "어디에 걸까요" 판의 id. 묶음, 낱개 카드 단추가 그리로 내려간다 */
export const PLAN_PICK_ID = "pick";

/** "이름: 설명" 을 이름만 굵게. 쌍점이 없으면 통째로 */
function Labeled({ text }: { text: string }) {
  const at = text.indexOf(": ");
  if (at < 0) return <>{text}</>;
  return (
    <>
      <b className="font-bold text-ink">{text.slice(0, at)}</b> {text.slice(at + 2)}
    </>
  );
}

function Bullets({ lines }: { lines: readonly React.ReactNode[] }) {
  return (
    <ul className="flex flex-col gap-2 text-[13.5px] leading-[1.55] text-ink-2">
      {lines.map((line, i) => (
        <li key={i} className="flex gap-2">
          <span aria-hidden className="mt-[8px] size-1 shrink-0 rounded-full bg-acc" />
          <span>{line}</span>
        </li>
      ))}
    </ul>
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

/** membership: 이용 중이면 남은 이용권. 없으면 null */
export function PlanCards({ membership }: { membership: { credits: number } | null }) {
  const plan = MEMBERSHIP_PLANS[DEFAULT_PLAN];
  const boost = PRODUCTS.boost_indie_7d;
  const bundle = PRODUCTS.bundle_7d;

  return (
    <div className="grid items-stretch gap-3 lg:grid-cols-3">
      <section className={sectionCardClass("flex flex-col gap-4")}>
        <Head name={M.membershipName} summary={M.membershipSummary} tag={membership ? <Tag tone="ok">{M.membershipActive}</Tag> : <Tag tone="outline">{M.membershipTag}</Tag>} />
        <div className="flex flex-col gap-1">
          <span className={BIG}>
            <span className="mr-1 text-[13px] font-semibold text-mut">{M.perMonth}</span>
            {formatPrice(plan.amount)}
          </span>
          <span className="text-[13px] text-mut">{M.perDayApprox(formatPrice(perDay(plan.amount, MONTH_DAYS_APPROX)))}</span>
        </div>
        <Now>{membership ? M.membershipCredits(membership.credits) : M.membershipNow}</Now>
        <Bullets
          lines={[
            <Labeled key="credits" text={M.creditsWhat(plan.boostCredits, formatPrice(creditsListValue(plan)))} />,
            ...M.memberPerks.map((perk) => (
              <span key={perk}>
                <Labeled text={perk} />{" "}
                <Tag tone="outline" small>
                  {M.memberOnly}
                </Tag>
              </span>
            )),
          ]}
        />
        <Link href={ROUTES.membership} className={buttonClass({ variant: membership ? "secondary" : "primary", fullWidth: true, className: "mt-auto" })}>
          {membership ? M.membershipManage : M.membershipStart}
        </Link>
      </section>

      <section className={sectionCardClass("flex flex-col gap-4 ring-2 ring-acc")}>
        <Head name={M.bundleName} summary={M.bundleSummary} tag={<Tag tone="acc">{M.bundleTag}</Tag>} />
        <div className="flex flex-col gap-1">
          <span className="flex flex-wrap items-center gap-2">
            <s className="text-[15px] font-medium tabular-nums text-dim">
              <span className="sr-only">{B.listPrice} </span>
              {formatPrice(BUNDLE_LIST_PRICE)}
            </s>
            <Tag tone="hot">{M.rate(BUNDLE_DISCOUNT_RATE)}</Tag>
          </span>
          <span className={BIG}>{formatPrice(bundle.amount)}</span>
          <span className="text-[13px] font-semibold text-danger">{M.saving(formatPrice(BUNDLE_SAVING))}</span>
        </div>
        <Now>{M.bundleNow}</Now>
        <Bullets
          lines={[
            <Labeled key="boost" text={`${M.boostName}: ${M.boostShort}`} />,
            <Labeled key="pin" text={`${M.pinName}: ${M.pinShort}`} />,
          ]}
        />
        <a href={`#${PLAN_PICK_ID}`} className={buttonClass({ variant: "accent", fullWidth: true, className: "mt-auto" })}>
          {M.pick}
        </a>
      </section>

      <section className={sectionCardClass("flex flex-col gap-4")}>
        <Head name={M.singleName} summary={M.singleSummary} />
        <span className={BIG}>{formatPrice(boost.amount)}</span>
        <Now>{M.bundleNow}</Now>
        <Bullets lines={[<Labeled key="boost" text={`${M.boostName}: ${M.boostShort}`} />, <Labeled key="pin" text={`${M.pinName}: ${M.pinShort}`} />]} />
        <p className="text-[13px] font-semibold text-danger">{M.singleHint(formatPrice(BUNDLE_SAVING))}</p>
        <a href={`#${PLAN_PICK_ID}`} className={buttonClass({ variant: "secondary", fullWidth: true, className: "mt-auto" })}>
          {M.pick}
        </a>
      </section>
    </div>
  );
}
