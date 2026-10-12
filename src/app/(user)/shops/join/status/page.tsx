// /shops/join/status — 신청 상태. 설계서 §11.
//
// 심사 중, 반려 사유, 재신청이 한 화면에서 끝난다. 반려를 메일로만 알리지 않는 이유:
// 메일은 안 열릴 수 있고, 그때 사람은 "왜 안 되지" 를 물어볼 자리가 없다.
// 상태 판은 흰 마디 카드다 — 회청 Panel 은 바탕(--bg)과 거의 같은 색이라 판이 안 보였다.
//
// 맨 위에 세 걸음 단계 표시를 둔다(2026-10-12 사용자: "신청 상태 화면도 뭐 없는데"). 신청서가 없을 때도 세운다 —
// 그 자리에서 "내면 무엇을 보게 되는가" 를 보여 주는 편이 빈 문장 한 줄보다 다음 행동을 준다.
import type { Metadata } from "next";
import Link from "next/link";
import { Page, PageHead, sectionCardClass } from "@/components/ui/page";
import { buttonClass } from "@/components/ui/button";
import { StatusTracker, type TrackerState } from "@/components/shops/status-tracker";
import { ROUTES, shopPath } from "@/lib/routes";
import { SHOP_MESSAGES as M } from "@/lib/shops/messages";
import { requireUserOrRedirect } from "@/server/auth/guards";
import { findMyShop, type ShopApplication } from "@/server/services/shops";

export const metadata: Metadata = { title: M.statusTitle };

/** 상태 한 줄. 반려는 별도 값이 아니라 "사유가 남은 pending" 이다(services/shops 의 reviewShop) */
function headline(shop: ShopApplication): { title: string; note: string } {
  if (shop.status === "active") return { title: M.statusActive, note: M.statusActiveNote };
  if (shop.status === "suspended") return { title: M.statusSuspended, note: shop.statusReason ?? "" };
  if (shop.statusReason) return { title: M.statusRejected, note: M.statusRejectedNote };
  return { title: M.statusPending, note: M.statusPendingNote };
}

/** 단계 표시가 어디에 서는가. 정지는 열린 뒤의 일이라 세 걸음을 다 지난 것으로 둔다 */
function trackerOf(shop: ShopApplication | null): TrackerState {
  if (!shop) return { at: 0, tone: "idle" };
  if (shop.status === "active") return { at: 3, tone: "done" };
  if (shop.status === "suspended") return { at: 2, tone: "danger" };
  return { at: 1, tone: shop.statusReason ? "danger" : "current" };
}

export default async function ShopJoinStatusPage() {
  const user = await requireUserOrRedirect();
  const shop = await findMyShop(user.id);
  const head = shop ? headline(shop) : { title: M.noApplication, note: M.noApplicationNote };

  const facts = shop
    ? [
        { label: M.nameLabel, value: shop.name },
        { label: M.slugLabel, value: shop.slug },
        ...(shop.address ? [{ label: M.addressLabel, value: shop.address }] : []),
      ]
    : [];

  // 다음 행동은 하나뿐이다 — 심사 중에는 할 일이 없어 단추 줄 자체를 세우지 않는다
  const action = !shop ? (
    <Link href={ROUTES.shopsJoin} className={buttonClass({ variant: "primary" })}>
      {M.joinTitle}
    </Link>
  ) : shop.status === "pending" && shop.statusReason ? (
    <Link href={ROUTES.shopsJoin} className={buttonClass({ variant: "primary" })}>
      {M.reapply}
    </Link>
  ) : shop.status === "active" ? (
    // 승인된 매장주가 "그래서 내 매장이 어디에 떴나" 를 물을 자리가 여기다.
    // 이 링크가 없던 동안 상태 화면은 "승인됐어요" 에서 끊겼다
    <Link href={shopPath(shop.slug)} className={buttonClass({ variant: "primary" })}>
      {M.viewMyShop}
    </Link>
  ) : null;

  return (
    <Page width="tight" gap={18}>
      <PageHead title={M.statusTitle} />

      <div className={sectionCardClass("flex flex-col gap-5")}>
        <StatusTracker label={M.trackerLabel} steps={M.trackerSteps} state={trackerOf(shop)} />

        <div className="flex flex-col gap-1 border-t border-line pt-5">
          <p className="text-[16px] font-bold tracking-[-0.02em] text-ink">{head.title}</p>
          {head.note && <p className="text-[13px] leading-[1.7] text-mut">{head.note}</p>}
        </div>

        {(facts.length > 0 || shop?.statusReason) && (
          <dl className="flex flex-col divide-y divide-line rounded-[var(--radius-md)] bg-surface-2 px-4 text-[13px]">
            {facts.map((f) => (
              <div key={f.label} className="flex justify-between gap-4 py-2.5">
                <dt className="shrink-0 text-dim">{f.label}</dt>
                <dd className="min-w-0 break-words text-right font-semibold text-ink">{f.value}</dd>
              </div>
            ))}
            {shop?.statusReason && (
              <div className="flex justify-between gap-4 py-2.5">
                <dt className="shrink-0 text-dim">{M.reasonLabel}</dt>
                <dd className="text-right font-semibold text-danger">{shop.statusReason}</dd>
              </div>
            )}
          </dl>
        )}

        {action && <div className="flex flex-wrap gap-2">{action}</div>}
      </div>
    </Page>
  );
}
