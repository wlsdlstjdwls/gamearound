// /admin/memberships — 메이커 멤버십 구독자(2026-10-27, 기획서 8장 "회원별 멤버십 목록").
// 머리에 숫자 넷(이용 중, 해지 예약, 결제 실패, 다음 달 청구 예상, 2026-10-29) — 목록 줄을 세지 않아도 구독 사업의 오늘이 보이게.
// 줄마다 상태, 카드, 이번 기간, 다음 결제, 남은 이용권, 연속 실패(2026-10-29 칸 맞춘 표로, data-rows). 환불은 결제와 환불 화면(/admin/payments)에서 한다 —
// 결제 줄 하나를 기준으로 돌려주는 일이라 그 목록에 두고, 멤버십 청구를 환불하면 멤버십도 끝난다(services/payments/refunds).
import type { Metadata } from "next";
import { AdminScreenHead } from "@/components/admin/screen/head";
import { ADMIN_NAV } from "@/lib/admin/messages";
import Link from "next/link";
import { StatTiles } from "@/components/admin/stat-tiles";
import { MembershipsScreen } from "@/components/admin/memberships-screen";
import { buttonClass } from "@/components/ui/button";
import { formatAmount } from "@/lib/currency";
import { MEMBERSHIP_MESSAGES as M } from "@/lib/membership/messages";
import { ROUTES } from "@/lib/routes";
import type { MembershipStatus } from "@/server/db/schema";
import { requireRoleOrForbid } from "@/server/auth/guards";
import { listMembershipsForAdmin } from "@/server/services/membership";

export const metadata: Metadata = { title: ADMIN_NAV.memberships };


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
      {/* 백오피스 고객상세정보 꼴 — 조회조건, 왼쪽 회원 목록, 오른쪽 묶음 상세(components/admin/memberships-screen) */}
      <MembershipsScreen rows={rows} />
    </div>
  );
}
