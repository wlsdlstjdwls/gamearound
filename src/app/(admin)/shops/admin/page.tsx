// /shops/admin — 입점승인관리. 설계서 §11.
//
// `/admin/shops` 가 아닌 이유: 주소를 잘못 치면 `/admin` 으로 들어간다. 다만 **경로 분리는 실수 방지고
// 진짜 방어는 여기 첫 줄의 requireRoleOrForbid 다.** 경로를 어디로 옮기든 그 줄이 없으면 뚫린다.
//
// `/shops/[slug]` 와 부딪히는 문제는 RESERVED_SHOP_SLUGS 가 신청 단계에서 막는다(lib/routes).
//
// 주소는 `/admin` 밖이어도 껍데기는 관리자 화면과 같다 — 관리자 레이아웃이 라우트 그룹 `(admin)` 에 있어서다.
// 화면 구성은 백오피스 승인 화면 꼴(components/admin/shops-screen). 여기는 상태를 읽고 줄을 넘기기만 한다.
import type { Metadata } from "next";
import { AdminScreenHead } from "@/components/admin/screen/head";
import { ShopsScreen } from "@/components/admin/shops-screen";
import { ADMIN_NAV } from "@/lib/admin/messages";
import { SHOP_ADMIN_MESSAGES } from "@/lib/shops/messages";
import { ROUTES } from "@/lib/routes";
import { requireRoleOrForbid } from "@/server/auth/guards";
import { listShopsByStatus } from "@/server/services/shops";
import type { ShopStatus } from "@/server/db/schema";

export const metadata: Metadata = { title: ADMIN_NAV.shops };
// 심사 화면은 늘 지금 값을 봐야 한다 — 승인하고 새로 고쳤는데 옛 목록이 뜨면 두 번 누른다
export const dynamic = "force-dynamic";

const STATUSES: Array<{ status: ShopStatus; label: string }> = [
  { status: "pending", label: SHOP_ADMIN_MESSAGES.pendingTab },
  { status: "active", label: SHOP_ADMIN_MESSAGES.activeTab },
  { status: "suspended", label: SHOP_ADMIN_MESSAGES.suspendedTab },
];

function isStatus(v: string | undefined): v is ShopStatus {
  return STATUSES.some((t) => t.status === v);
}

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function ShopsAdminPage({ searchParams }: Props) {
  await requireRoleOrForbid("admin");
  const raw = (await searchParams).status;
  const picked = Array.isArray(raw) ? raw[0] : raw;
  const status: ShopStatus = isStatus(picked) ? picked : "pending";
  const shops = await listShopsByStatus(status);

  return (
    <>
      <AdminScreenHead title={ADMIN_NAV.shops} count={shops.length} />
      {/* 상태가 바뀌면 고른 줄, 체크를 비운다 — 다른 목록의 열쇠가 남아 엉뚱한 매장을 처리하지 않게 */}
      <ShopsScreen
        key={status}
        rows={shops}
        status={status}
        statuses={STATUSES.map((t) => ({ value: t.status, label: t.label, href: t.status === "pending" ? ROUTES.shopsAdmin : `${ROUTES.shopsAdmin}?status=${t.status}` }))}
      />
    </>
  );
}
