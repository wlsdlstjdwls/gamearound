// /vendor — 내가 속한 매장. 설계서 §11 "매장주".
//
// 한 곳이면 바로 넘긴다. 매장 하나짜리 매장주(대부분이다)에게 "고를 것이 하나뿐인 목록" 을
// 매번 보여 줄 이유가 없다.
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Panel, Page, PageHead } from "@/components/ui/page";
import { buttonClass } from "@/components/ui/button";
import { ROUTES, shopPath, vendorListingsPath } from "@/lib/routes";
import { VENDOR_MESSAGES as M } from "@/lib/shops/listing-messages";
import { requireUserOrRedirect } from "@/server/auth/guards";
import { listMyShops, type ShopStaffRole } from "@/server/services/shops";

export const metadata: Metadata = { title: M.title };

const ROLE_LABEL: Record<ShopStaffRole, string> = {
  owner: M.roleOwner,
  manager: M.roleManager,
  staff: M.roleStaff,
};

export default async function VendorPage() {
  const user = await requireUserOrRedirect();
  const mine = await listMyShops(user.id);
  if (mine.length === 1) redirect(vendorListingsPath(mine[0].slug));

  return (
    <Page width="tight" gap={18}>
      <PageHead title={M.title} note={M.lead} />

      {mine.length === 0 ? (
        // 직원 표에 행이 서는 것은 승인 순간이다(services/shops 의 reviewShop) —
        // 여기가 비었다는 것은 아직 승인 전이거나 신청도 안 했다는 뜻이다
        <Panel className="flex flex-col items-start gap-3 px-4 py-4">
          <p className="text-[13px] text-mut">{M.noShop}</p>
          <p className="text-[12.5px] text-dim">{M.pendingNote}</p>
          <div className="flex flex-wrap gap-2">
            <Link href={ROUTES.business} className={buttonClass({ variant: "primary" })}>
              {M.noShopAction}
            </Link>
            <Link href={ROUTES.shopsJoinStatus} className={buttonClass({ variant: "ghost" })}>
              {M.openPublic}
            </Link>
          </div>
        </Panel>
      ) : (
        <ul className="flex flex-col gap-2.5">
          {mine.map((shop) => (
            <li key={shop.slug}>
              <Panel className="flex flex-wrap items-center gap-3 px-4 py-3.5">
                <div className="min-w-0 flex-1">
                  <p className="text-[14px] font-semibold text-ink">{shop.name}</p>
                  <p className="text-[12px] text-dim">{ROLE_LABEL[shop.role]}</p>
                </div>
                <Link href={vendorListingsPath(shop.slug)} className={buttonClass({ variant: "primary", size: "sm" })}>
                  {M.openListings}
                </Link>
                <Link href={shopPath(shop.slug)} className={buttonClass({ variant: "ghost", size: "sm" })}>
                  {M.openPublic}
                </Link>
              </Panel>
            </li>
          ))}
        </ul>
      )}
    </Page>
  );
}
