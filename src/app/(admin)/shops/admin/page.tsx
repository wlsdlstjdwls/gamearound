// /shops/admin — 입점 심사. 설계서 §11.
//
// `/admin/shops` 가 아닌 이유: 주소를 잘못 치면 `/admin` 으로 들어간다. 다만 **경로 분리는 실수 방지고
// 진짜 방어는 여기 첫 줄의 requireRoleOrForbid 다.** 경로를 어디로 옮기든 그 줄이 없으면 뚫린다.
//
// `/shops/[slug]` 와 부딪히는 문제는 RESERVED_SHOP_SLUGS 가 신청 단계에서 막는다(lib/routes).
//
// 주소는 `/admin` 밖이어도 껍데기는 관리자 화면과 같다 — 관리자 레이아웃이 라우트 그룹 `(admin)` 에 있어서다.
// 앞서는 레이아웃이 `(admin)/admin` 에만 있어 메뉴에서 이 칸을 누르면 기둥과 흰 판이 통째로 사라졌다(2026-10-08).
import type { Metadata } from "next";
import Link from "next/link";
import { ShopReviewCard } from "@/components/shops/review-card";
import { PageHead } from "@/components/ui/page";
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
    <>
      <section className="flex flex-col gap-2">
        <PageHead title={SHOP_ADMIN_MESSAGES.title} />
        <p className="max-w-[620px] text-[13px] text-mut">{SHOP_ADMIN_MESSAGES.lead}</p>
      </section>

      <section className="flex flex-col gap-3">
        <nav aria-label={SHOP_ADMIN_MESSAGES.tabsLabel} className="flex flex-wrap gap-1.5">
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
          // 빈 칸 안내는 다른 관리자 큐와 같은 회색 면이다 — 흰 판 위에서 "비었다" 가 한 덩어리로 읽힌다
          <p className="rounded-xl bg-surface-2 px-5 py-6 text-[13px] text-mut">{SHOP_ADMIN_MESSAGES.empty}</p>
        ) : (
          // 칸 수를 화면 폭이 아니라 카드 폭이 정한다 — 본문은 기둥 곁이라 sm: 같은 화면 기준점으로는
          // 카드 둘이 사유 칸과 버튼을 못 담을 만큼 좁아지는 구간이 생긴다
          <ul className="grid grid-cols-[repeat(auto-fill,minmax(min(360px,100%),1fr))] gap-3">
            {shops.map((shop) => (
              <li key={shop.id}>
                <ShopReviewCard shop={shop} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
