// /admin/memberships — 메이커 멤버십 구독자(2026-10-27, 기획서 8장 "회원별 멤버십 목록").
// 머리에 숫자 넷(이용 중, 해지 예약, 결제 실패, 다음 달 청구 예상, 2026-10-29) — 목록 줄을 세지 않아도 구독 사업의 오늘이 보이게.
// 줄마다 상태, 카드, 이번 기간, 다음 결제, 남은 이용권, 연속 실패(2026-10-29 칸 맞춘 표로, data-rows). 환불은 결제와 환불 화면(/admin/payments)에서 한다 —
// 결제 줄 하나를 기준으로 돌려주는 일이라 그 목록에 두고, 멤버십 청구를 환불하면 멤버십도 끝난다(services/payments/refunds).
import type { Metadata } from "next";
import { AdminScreenHead } from "@/components/admin/screen/head";
import { ADMIN_NAV } from "@/lib/admin/messages";
import Link from "next/link";
import { StatTiles } from "@/components/admin/stat-tiles";
import { buttonClass } from "@/components/ui/button";
import { DataCell, DataHead, DataList, DataRow } from "@/components/admin/data-rows";
import { MEMBERSHIP_COLS } from "@/lib/admin/table-cols";
import { Tag, type TagTone } from "@/components/ui/tag";
import { formatAmount, formatPrice } from "@/lib/currency";
import { formatDate } from "@/lib/format";
import { MEMBERSHIP_MESSAGES as M, MEMBERSHIP_STATUS_LABEL } from "@/lib/membership/messages";
import { ROUTES } from "@/lib/routes";
import type { MembershipStatus } from "@/server/db/schema";
import { requireRoleOrForbid } from "@/server/auth/guards";
import { listMembershipsForAdmin } from "@/server/services/membership";

export const metadata: Metadata = { title: ADMIN_NAV.memberships };

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
      <AdminScreenHead
        title={ADMIN_NAV.memberships}
        lead={M.adminLead}
        count={rows.length}
        actions={
          <Link href={ROUTES.adminPayments} className={buttonClass({ variant: "secondary", size: "sm" })}>
            {M.adminPaymentsLink}
          </Link>
        }
      />
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
        // 넓은 화면은 칸이 줄 맞춰 선 표, 좁은 화면은 한 사람이 카드 한 장(data-rows). 앞 판은 값을 " | " 로 이은 한 줄이라
        // 다음 결제일이나 이용권을 위아래로 견줄 수 없었다(2026-10-29 사용자 "가시성, 가독성")
        <div className="flex flex-col gap-1">
          <DataHead cols={MEMBERSHIP_COLS} labels={[M.adminColStatus, M.adminColMember, M.adminColCard, M.adminColPeriod, M.nextCharge, M.credits, M.adminColAmount]} />
          <DataList>
            {rows.map((m) => (
              <DataRow key={m.email} cols={MEMBERSHIP_COLS}>
                <DataCell label={M.adminColStatus}>
                  <Tag tone={STATUS_TONE[m.status]}>{MEMBERSHIP_STATUS_LABEL[m.status]}</Tag>
                </DataCell>
                <DataCell label={M.adminColMember}>
                  <span className="block break-words font-semibold">{m.email}</span>
                  <span className="block text-[12px] text-dim">{m.planName}</span>
                  {m.failedAttempts > 0 && <span className="block text-[12px] text-danger">{[M.adminFailed(m.failedAttempts), m.lastFailMessage].filter(Boolean).join(" | ")}</span>}
                </DataCell>
                <DataCell label={M.adminColCard} className="text-mut">
                  {m.cardLabel ?? "-"}
                </DataCell>
                <DataCell label={M.adminColPeriod} className="tabular-nums text-mut">
                  {`${formatDate(m.periodStart)} ~ ${formatDate(m.periodEnd)}`}
                </DataCell>
                <DataCell label={M.nextCharge} className="tabular-nums">
                  {m.nextChargeAt ? formatDate(m.nextChargeAt) : "-"}
                </DataCell>
                <DataCell label={M.credits} className="tabular-nums">
                  {M.creditsCount(m.usableCredits)}
                </DataCell>
                <DataCell label={M.adminColAmount} className="font-bold tabular-nums md:text-right">
                  {formatPrice(m.amount)}
                </DataCell>
              </DataRow>
            ))}
          </DataList>
        </div>
      )}
    </div>
  );
}
