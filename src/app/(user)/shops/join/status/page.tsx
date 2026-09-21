// /shops/join/status — 신청 상태. 설계서 §11.
//
// 심사 중, 반려 사유, 재신청이 한 화면에서 끝난다. 반려를 메일로만 알리지 않는 이유:
// 메일은 안 열릴 수 있고, 그때 사람은 "왜 안 되지" 를 물어볼 자리가 없다.
import type { Metadata } from "next";
import Link from "next/link";
import { Panel, Page, PageHead } from "@/components/ui/page";
import { buttonClass } from "@/components/ui/button";
import { ROUTES, shopPath } from "@/lib/routes";
import { SHOP_MESSAGES } from "@/lib/shops/messages";
import { requireUserOrRedirect } from "@/server/auth/guards";
import { findMyShop, type ShopApplication } from "@/server/services/shops";

export const metadata: Metadata = { title: SHOP_MESSAGES.statusTitle };

/** 상태 한 줄. 반려는 별도 값이 아니라 "사유가 남은 pending" 이다(services/shops 의 reviewShop) */
function headline(shop: ShopApplication): { title: string; note: string } {
  if (shop.status === "active") return { title: SHOP_MESSAGES.statusActive, note: SHOP_MESSAGES.statusActiveNote };
  if (shop.status === "suspended") return { title: SHOP_MESSAGES.statusSuspended, note: shop.statusReason ?? "" };
  if (shop.statusReason) return { title: "다시 확인이 필요해요", note: "아래 사유를 고쳐서 다시 내 주세요." };
  return { title: SHOP_MESSAGES.statusPending, note: SHOP_MESSAGES.statusPendingNote };
}

export default async function ShopJoinStatusPage() {
  const user = await requireUserOrRedirect();
  const shop = await findMyShop(user.id);
  const head = shop ? headline(shop) : null;

  return (
    <Page width="tight" gap={18}>
      <PageHead title={SHOP_MESSAGES.statusTitle} />

      {!shop ? (
        <Panel className="flex flex-col items-start gap-3 px-4 py-4">
          <p className="text-[13px] text-mut">{SHOP_MESSAGES.noApplication}</p>
          <Link href={ROUTES.shopsJoin} className={buttonClass({ variant: "primary" })}>
            {SHOP_MESSAGES.joinTitle}
          </Link>
        </Panel>
      ) : (
        <Panel className="flex flex-col gap-3 px-4 py-4">
          <div className="flex flex-col gap-1">
            <p className="text-[15px] font-bold text-ink">{head!.title}</p>
            {head!.note && <p className="text-[13px] leading-[1.7] text-mut">{head!.note}</p>}
          </div>

          <dl className="flex flex-col gap-1.5 text-[12.5px]">
            <div className="flex gap-2">
              <dt className="w-[72px] shrink-0 text-dim">{SHOP_MESSAGES.nameLabel}</dt>
              <dd className="text-mut">{shop.name}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="w-[72px] shrink-0 text-dim">{SHOP_MESSAGES.slugLabel}</dt>
              <dd className="text-mut">{shop.slug}</dd>
            </div>
            {shop.address && (
              <div className="flex gap-2">
                <dt className="w-[72px] shrink-0 text-dim">{SHOP_MESSAGES.addressLabel}</dt>
                <dd className="text-mut">{shop.address}</dd>
              </div>
            )}
            {shop.statusReason && (
              <div className="flex gap-2">
                <dt className="w-[72px] shrink-0 text-dim">{SHOP_MESSAGES.reasonLabel}</dt>
                <dd className="text-danger">{shop.statusReason}</dd>
              </div>
            )}
          </dl>

          <div className="flex flex-wrap gap-2">
            {shop.status === "pending" && shop.statusReason && (
              <Link href={ROUTES.shopsJoin} className={buttonClass({ variant: "primary" })}>
                {SHOP_MESSAGES.reapply}
              </Link>
            )}
            {/* 승인된 매장주가 "그래서 내 매장이 어디에 떴나" 를 물을 자리가 여기다.
                이 링크가 없던 동안 상태 화면은 "승인됐어요" 에서 끊겼다 */}
            {shop.status === "active" && (
              <Link href={shopPath(shop.slug)} className={buttonClass({ variant: "primary" })}>
                {SHOP_MESSAGES.viewMyShop}
              </Link>
            )}
          </div>
        </Panel>
      )}
    </Page>
  );
}
