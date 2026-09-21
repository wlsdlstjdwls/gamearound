// /shops/admin — 입점 심사. 설계서 §11.
//
// `/admin/shops` 가 아닌 이유: 주소를 잘못 치면 `/admin` 으로 들어간다. 다만 **경로 분리는 실수 방지고
// 진짜 방어는 여기 첫 줄의 requireRoleOrForbid 다.** 경로를 어디로 옮기든 그 줄이 없으면 뚫린다.
//
// `/shops/[slug]` 와 부딪히는 문제는 RESERVED_SHOP_SLUGS 가 신청 단계에서 막는다(lib/routes).
import type { Metadata } from "next";
import Link from "next/link";
import { ShopReviewCard } from "@/components/shops/review-card";
import { Panel, Page, PageHead } from "@/components/ui/page";
import { chipClass } from "@/components/ui/chip";
import { SHOP_ADMIN_MESSAGES } from "@/lib/shops/messages";
import { ROUTES } from "@/lib/routes";
import { requireRoleOrForbid } from "@/server/auth/guards";
import { listShopsByStatus } from "@/server/services/shops";
import type { ShopStatus } from "@/server/db/schema";

export const metadata: Metadata = { title: SHOP_ADMIN_MESSAGES.title };
// 심사 화면은 늘 지금 값을 봐야 한다 — 승인하고 새로 고쳤는데 옛 목록이 뜨면 두 번 누른다
export const dynamic = "force-dynamic";

const TABS: Array<{ status: ShopStatus; label: string }> = [
  { status: "pending", label: SHOP_ADMIN_MESSAGES.pendingTab },
  { status: "active", label: SHOP_ADMIN_MESSAGES.activeTab },
  { status: "suspended", label: SHOP_ADMIN_MESSAGES.suspendedTab },
];

function isStatus(v: string | undefined): v is ShopStatus {
  return TABS.some((t) => t.status === v);
}

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function ShopsAdminPage({ searchParams }: Props) {
  await requireRoleOrForbid("admin");
  const raw = (await searchParams).status;
  const picked = Array.isArray(raw) ? raw[0] : raw;
  const status: ShopStatus = isStatus(picked) ? picked : "pending";
  const shops = await listShopsByStatus(status);

  return (
    <Page gap={18}>
      <PageHead title={SHOP_ADMIN_MESSAGES.title} note={SHOP_ADMIN_MESSAGES.lead} />

      <nav aria-label="상태" className="flex flex-wrap gap-1.5">
        {TABS.map((t) => (
          <Link
            key={t.status}
            href={t.status === "pending" ? ROUTES.shopsAdmin : `${ROUTES.shopsAdmin}?status=${t.status}`}
            aria-current={t.status === status ? "true" : undefined}
            className={chipClass({ active: t.status === status })}
          >
            {t.label}
          </Link>
        ))}
      </nav>

      {shops.length === 0 ? (
        <Panel className="px-4 py-6 text-center text-[13px] text-dim">{SHOP_ADMIN_MESSAGES.empty}</Panel>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {shops.map((shop) => (
            <li key={shop.id}>
              <ShopReviewCard shop={shop} />
            </li>
          ))}
        </ul>
      )}
    </Page>
  );
}
