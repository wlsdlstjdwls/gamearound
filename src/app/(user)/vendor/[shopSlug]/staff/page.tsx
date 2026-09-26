// /vendor/[shopSlug]/staff — 직원 목록과 초대. 설계서 §9, §11 "매장주".
//
// 매장 사람이면 누구나 이 화면을 본다(누구와 함께 일하는지는 알아야 한다). 초대와 내보내기 칸은 대표에게만 선다 —
// 화면이 숨기는 것은 실수 방지고, 막는 것은 액션의 권한 검사다(staff/actions.ts).
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { StaffInviteForm, StaffInvites, StaffMembers } from "@/components/shops/staff-panel";
import { Panel, Page, PageHead, SectionHead } from "@/components/ui/page";
import { buttonClass } from "@/components/ui/button";
import { vendorListingsPath } from "@/lib/routes";
import { STAFF_MESSAGES as M } from "@/lib/shops/staff-messages";
import { requireShopRole } from "@/server/auth/guards";
import { findShopBySlug, listOpenInvites, listStaffMembers } from "@/server/services/shops";

type Props = { params: Promise<{ shopSlug: string }> };

export const metadata: Metadata = { title: M.title };

export default async function VendorStaffPage({ params }: Props) {
  const { shopSlug } = await params;
  const shop = await findShopBySlug(shopSlug);
  if (!shop) notFound();
  const access = await requireShopRole(shop.id, "owner", "manager", "staff");
  // 관리자는 대표 대신 손댈 수 있다(설계서 §10) — 그 일은 감사 컬럼에 admin 으로 남는다
  const canManage = access.isAdminOverride || access.role === "owner";

  const [members, invites] = await Promise.all([listStaffMembers(shop.id), listOpenInvites(shop.id)]);

  return (
    <Page width="tight" gap={20}>
      <PageHead title={shop.name} note={M.lead} />

      <div className="flex flex-wrap gap-2">
        <Link href={vendorListingsPath(shop.slug)} className={buttonClass({ variant: "ghost", size: "sm" })}>
          {M.openListings}
        </Link>
      </div>

      <section className="flex flex-col gap-3">
        <SectionHead title={M.membersTitle} note={`${members.length}명`} />
        <StaffMembers shopSlug={shop.slug} members={members} meId={access.user.id} canManage={canManage} />
      </section>

      <section className="flex flex-col gap-3">
        <SectionHead title={M.invitesTitle} />
        <StaffInvites shopSlug={shop.slug} invites={invites} canManage={canManage} />
      </section>

      <section className="flex flex-col gap-3">
        <SectionHead title={M.inviteTitle} />
        <Panel className="px-4 py-4">
          {canManage ? <StaffInviteForm shopSlug={shop.slug} /> : <p className="text-[13px] text-dim">{M.ownerOnly}</p>}
        </Panel>
      </section>
    </Page>
  );
}
