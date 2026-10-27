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
import { MEMBERSHIP_MESSAGES as M, MEMBERSHIP_STATUS_LABEL } from "@/lib/membership/messages";
import { DEFAULT_PLAN, MEMBERSHIP_PLANS } from "@/lib/membership/plan";
import { PAYMENT_MESSAGES as PM } from "@/lib/payments/messages";
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
  const [m, sp] = await Promise.all([getMyMembership(user.id), searchParams]);
  const started = firstParam(sp.started);
  const failed = firstParam(sp.failed);
  const plan = MEMBERSHIP_PLANS[DEFAULT_PLAN];
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
      {started && <FormMessage tone="success">{M.startedBanner}</FormMessage>}
      {failed && <FormMessage tone="error">{M.failedBanner(failed)}</FormMessage>}

      {live ? (
        <section className={sectionCardClass("flex flex-col gap-4")}>
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-[18px] font-bold text-ink">{m.planName}</h2>
            <Tag tone={STATUS_TONE[m.status]}>{MEMBERSHIP_STATUS_LABEL[m.status]}</Tag>
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
          <div className="flex items-baseline justify-between">
            <h2 className="text-[18px] font-bold text-ink">{plan.name}</h2>
            <span className="text-[22px] font-black tabular-nums text-ink">
              <span className="mr-1 text-[13px] font-semibold text-mut">{M.perMonth}</span>
              {formatPrice(plan.amount)}
            </span>
          </div>
          <ul className="flex flex-col gap-1.5 text-[13.5px] leading-[1.6] text-ink-2">
            {M.benefits.map((line) => (
              <li key={line} className="flex gap-2">
                <span aria-hidden className="mt-[9px] size-1 shrink-0 rounded-full bg-acc" />
                {line}
              </li>
            ))}
          </ul>
          {!tossBillingConfigured() ? (
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
