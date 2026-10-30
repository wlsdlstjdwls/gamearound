// /indie/mine/membership — 메이커 멤버십(2026-10-27, 기획서 4.3 월 19,900원, 8장 "멤버십 안내와 가입, 내 멤버십(남은 부스트, 다음 결제일, 해지)").
// 이용 중이면 상태판(카드, 기간, 다음 결제, 남은 이용권, 해지), 아니면 안내와 카드 등록 단추.
// 카드 등록 창에서 돌아오면(?started=1 또는 ?failed=문구, api/payments/toss/billing) 맨 위에 결과를 한 줄로 말한다.
// 정기결제 키(API 개별 연동)가 없으면 "준비 중" 만 말한다 — 결제위젯 키로는 빌링이 열리지 않는다(server/payments/toss-billing).
import type { Metadata } from "next";
import Link from "next/link";
import { BillingStart } from "@/components/membership/billing-start";
import { MembershipControls } from "@/components/membership/membership-controls";
import { FormMessage } from "@/components/ui/form-message";
import { Page, PageHead, sectionCardClass } from "@/components/ui/page";
import { Tag, type TagTone } from "@/components/ui/tag";
import { formatPrice } from "@/lib/currency";
import { formatDate } from "@/lib/format";
import { firstParam } from "@/lib/games-query";
import { MEMBERSHIP_MESSAGES as M } from "@/lib/membership/messages";
import { codeName } from "@/lib/codes/book";
import { getCodeBook } from "@/server/services/common-codes";
import { PAYMENT_MESSAGES as PM } from "@/lib/payments/messages";
import { MembershipPrice } from "@/components/payments/plan-cards";
import { creditsListValue } from "@/lib/pricing/quote";
import { CREDIT_DAYS } from "@/lib/payments/products";
import { fillCopy } from "@/lib/pricing/settings";
import { getPriceBook } from "@/server/services/pricing";
import { getPricingSettings } from "@/server/services/settings";
import { ROUTES } from "@/lib/routes";
import type { MembershipStatus } from "@/server/db/schema";
import { requireUserOrRedirect } from "@/server/auth/guards";
import { tossBillingClientKey, tossBillingConfigured } from "@/server/payments/toss-billing";
import { getMyMembership } from "@/server/services/membership";

export const metadata: Metadata = { title: M.title, robots: { index: false } };

const STATUS_TONE: Record<MembershipStatus, TagTone> = { active: "ok", canceling: "warn", past_due: "danger", ended: "acc" };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function MembershipPage({ searchParams }: Props) {
  const user = await requireUserOrRedirect();
  const [m, sp, settings, book, codes] = await Promise.all([getMyMembership(user.id), searchParams, getPricingSettings(), getPriceBook(user.id), getCodeBook()]);
  const started = firstParam(sp.started);
  const failed = firstParam(sp.failed);
  const copy = settings.membership;
  const words = settings.copy.membership;
  const fill = (t: string) => fillCopy(t, { credits: String(copy.boostCredits) });
  const live = m && m.status !== "ended";
  const clientKey = tossBillingClientKey();

  return (
    <Page gap={20} width="tight">
      <PageHead
        title={M.title}
        action={
          <Link href={ROUTES.indiePayments} className="tap inline-flex items-center text-[13.5px] font-semibold text-acc hover:underline">
            {PM.toHistory}
          </Link>
        }
      >
        <p className="text-[14px] text-mut">{M.lead}</p>
      </PageHead>
      {started && <FormMessage tone="success">{M.startedBanner(copy.boostCredits)}</FormMessage>}
      {failed && <FormMessage tone="error">{M.failedBanner(failed)}</FormMessage>}

      {live ? (
        <section className={sectionCardClass("flex flex-col gap-4")}>
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-[18px] font-bold text-ink">{m.planName}</h2>
            <Tag tone={STATUS_TONE[m.status]}>{codeName(codes, "MEMBERSHIP_STATUS", m.status)}</Tag>
          </div>
          {m.status === "past_due" && m.nextChargeAt && <FormMessage tone="error">{M.pastDue(m.lastFailMessage ?? M.failed, formatDate(m.nextChargeAt))}</FormMessage>}
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-[14px]">
            {[
              { k: M.card, v: m.cardLabel ?? "-" },
              { k: M.period, v: `${formatDate(m.periodStart)} ~ ${formatDate(m.periodEnd)}` },
              { k: M.nextCharge, v: m.nextChargeAt ? `${formatDate(m.nextChargeAt)} | ${formatPrice(m.amount)}` : "-" },
              { k: M.credits, v: M.creditsCount(m.usableCredits) },
            ].map((row) => (
              <div key={row.k} className="flex flex-col gap-0.5">
                <dt className="text-[12.5px] text-dim">{row.k}</dt>
                <dd className="font-semibold tabular-nums text-ink">{row.v}</dd>
              </div>
            ))}
          </dl>
          {(m.status === "active" || m.status === "canceling") && <MembershipControls canceling={m.status === "canceling"} untilLabel={formatDate(m.periodEnd)} />}
        </section>
      ) : (
        <section className={sectionCardClass("flex flex-col gap-4")}>
          {m?.status === "ended" && <FormMessage tone="info">{M.ended}</FormMessage>}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex flex-col gap-1">
              <h2 className="text-[18px] font-bold text-ink">{words.name}</h2>
              <p className="text-[13.5px] text-ink-2">{fill(words.summary)}</p>
            </div>
            {/* 첫 달 할인이 걸리면 다음 달부터의 값을 바로 아래 적는다(components/payments/plan-cards 의 MembershipPrice) */}
            <MembershipPrice quote={book.membership} />
          </div>
          {/* 지금 받는 것과 그 값어치를 값 바로 아래 — 이용권 환산은 멤버십 값보다 낮아 정가처럼 긋지 않는다 */}
          <p className="rounded-xl bg-acc-soft px-3 py-2 text-[13px] font-semibold text-acc">
            {words.now} | {M.creditsWorth(copy.boostCredits, formatPrice(creditsListValue(settings, CREDIT_DAYS)))}
          </p>
          <ul className="flex flex-col gap-1.5 text-[13.5px] leading-[1.6] text-ink-2">
            {words.benefits.map((line) => (
              <li key={line} className="flex gap-2">
                <span aria-hidden className="mt-[9px] size-1 shrink-0 rounded-full bg-acc" />
                {fill(line)}
              </li>
            ))}
          </ul>
          {!copy.active ? (
            <FormMessage tone="info">{M.notOnSale}</FormMessage>
          ) : !tossBillingConfigured() ? (
            <FormMessage tone="info">{M.notConfigured}</FormMessage>
          ) : (
            <>
              {clientKey.startsWith("test_") && <p className="rounded-xl bg-surface-2 px-4 py-3 text-[13px] text-mut">{M.testMode}</p>}
              <BillingStart clientKey={clientKey} customerKey={user.id} />
            </>
          )}
        </section>
      )}
    </Page>
  );
}
