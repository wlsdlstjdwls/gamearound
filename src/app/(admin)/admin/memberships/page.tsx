// /admin/memberships — 메이커 멤버십 구독자(2026-10-27, 기획서 8장 "회원별 멤버십 목록").
// 머리에 숫자 넷(이용 중, 해지 예약, 결제 실패, 다음 달 청구 예상, 2026-10-29) — 목록 줄을 세지 않아도 구독 사업의 오늘이 보이게.
// 줄마다 상태, 카드, 이번 기간, 다음 결제, 남은 이용권, 연속 실패. 환불은 결제와 환불 화면(/admin/payments)에서 한다 —
// 결제 줄 하나를 기준으로 돌려주는 일이라 그 목록에 두고, 멤버십 청구를 환불하면 멤버십도 끝난다(services/payments/refunds).
import type { Metadata } from "next";
import Link from "next/link";
import { StatTiles } from "@/components/admin/stat-tiles";
import { PageHead, ROWS } from "@/components/ui/page";
import { Tag, type TagTone } from "@/components/ui/tag";
import { formatAmount, formatPrice } from "@/lib/currency";
import { formatDate } from "@/lib/format";
import { MEMBERSHIP_MESSAGES as M, MEMBERSHIP_STATUS_LABEL } from "@/lib/membership/messages";
import { ROUTES } from "@/lib/routes";
import type { MembershipStatus } from "@/server/db/schema";
import { requireRoleOrForbid } from "@/server/auth/guards";
import { listMembershipsForAdmin } from "@/server/services/membership";

export const metadata: Metadata = { title: M.adminTitle };

const STATUS_TONE: Record<MembershipStatus, TagTone> = { active: "ok", canceling: "warn", past_due: "danger", ended: "acc" };

export default async function AdminMembershipsPage() {
  await requireRoleOrForbid("admin");
  const rows = await listMembershipsForAdmin();
  const count = (st: MembershipStatus) => rows.filter((m) => m.status === st).length;
  // 다음 달에 실제로 청구될 줄만 — 해지 예약은 이번 기간이 끝나면 멈추고, 결제 실패는 다시 청구하지만 될지 모른다
  const monthly = rows.filter((m) => m.status === "active").reduce((n, m) => n + m.amount, 0);
  const pastDue = count("past_due");

  return (
    <div className="flex flex-col gap-5">
      <div>
        <PageHead size="admin" title={M.adminTitle} />
        <p className="mt-1 max-w-[760px] text-[12.5px] leading-[1.6] text-dim">
          {M.adminLead}{" "}
          <Link href={ROUTES.adminPayments} className="font-semibold text-acc hover:underline">
            {M.adminPaymentsLink}
          </Link>
        </p>
      </div>
      <StatTiles
        tiles={[
          { label: M.adminStatActive, value: M.adminStatPeople(count("active")) },
          { label: M.adminStatCanceling, value: M.adminStatPeople(count("canceling")) },
          { label: M.adminStatPastDue, value: M.adminStatPeople(pastDue), tone: pastDue > 0 ? "danger" : undefined },
          { label: M.adminStatMonthly, value: formatAmount(monthly), hint: M.adminStatMonthlyHint },
        ]}
      />
      {rows.length === 0 ? (
        <p className="rounded-xl bg-surface-2 px-4 py-3.5 text-[13px] text-mut">{M.adminEmpty}</p>
      ) : (
        <ul className={ROWS}>
          {rows.map((m) => (
            <li key={m.email} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <div className="flex min-w-0 flex-col gap-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Tag tone={STATUS_TONE[m.status]}>{MEMBERSHIP_STATUS_LABEL[m.status]}</Tag>
                  <span className="min-w-0 break-words text-[14.5px] font-semibold text-ink">{m.email}</span>
                </div>
                <span className="break-words text-[12.5px] text-dim tabular-nums">
                  {[m.planName, m.cardLabel ?? "-", `${formatDate(m.periodStart)} ~ ${formatDate(m.periodEnd)}`, `${M.nextCharge} ${m.nextChargeAt ? formatDate(m.nextChargeAt) : "-"}`].join(" | ")}
                </span>
                {m.failedAttempts > 0 && <span className="text-[12.5px] text-danger">{[M.adminFailed(m.failedAttempts), m.lastFailMessage].filter(Boolean).join(" | ")}</span>}
              </div>
              <div className="flex shrink-0 flex-col items-end gap-0.5 text-[13px] tabular-nums">
                <span className="font-bold text-ink">{formatPrice(m.amount)}</span>
                <span className="text-dim">
                  {M.credits} {M.creditsCount(m.usableCredits)}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
