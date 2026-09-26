// /vendor/[shopSlug]/listings — 판매 목록. 설계서 §11 "매장주".
//
// 목록과 추가 폼을 한 화면에 둔다. 매장이 재고를 적는 일은 "올리고 바로 다음 것을 올리는" 반복이라
// 추가를 다른 화면으로 보내면 그 왕복이 물건 수만큼 는다.
//
// CSV 는 손입력 아래에 둔다. 매일 쓰는 것은 한 건씩 올리는 폼이고, 파일은 처음 입점할 때나 재고를 몰아 맞출 때 쓴다.
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ListingCsvForm } from "@/components/shops/listing-csv-form";
import { ListingForm } from "@/components/shops/listing-form";
import { ListingRows } from "@/components/shops/listing-rows";
import { Panel, Page, PageHead, SectionHead } from "@/components/ui/page";
import { buttonClass } from "@/components/ui/button";
import { shopPath, vendorStaffPath } from "@/lib/routes";
import { STAFF_MESSAGES } from "@/lib/shops/staff-messages";
import { CSV_MESSAGES, LISTING_MESSAGES as M, VENDOR_MESSAGES } from "@/lib/shops/listing-messages";
import { requireShopRole } from "@/server/auth/guards";
import { findShopBySlug } from "@/server/services/shops";
import { listHardwareModels, listShopListings } from "@/server/services/listings";

type Props = { params: Promise<{ shopSlug: string }> };

export const metadata: Metadata = { title: M.title };

export default async function VendorListingsPage({ params }: Props) {
  const { shopSlug } = await params;
  const shop = await findShopBySlug(shopSlug);
  if (!shop) notFound();
  // 로그인만으로는 남의 매장이 안 막힌다 — 매장 단위 권한을 여기서 본다(guards 의 requireShopRole)
  await requireShopRole(shop.id, "owner", "manager", "staff");

  const [listings, hardware] = await Promise.all([listShopListings(shop.id), listHardwareModels()]);

  return (
    <Page width="tight" gap={20}>
      <PageHead title={shop.name} note={M.lead} />

      <div className="flex flex-wrap gap-2">
        <Link href={shopPath(shop.slug)} className={buttonClass({ variant: "ghost", size: "sm" })}>
          {VENDOR_MESSAGES.openPublic}
        </Link>
        <Link href={vendorStaffPath(shop.slug)} className={buttonClass({ variant: "ghost", size: "sm" })}>
          {STAFF_MESSAGES.openStaff}
        </Link>
      </div>

      <section className="flex flex-col gap-3">
        <SectionHead title={M.title} note={listings.length > 0 ? `${listings.length}건` : undefined} />
        {listings.length === 0 ? (
          <Panel className="px-4 py-6 text-center text-[13px] text-dim">{M.empty}</Panel>
        ) : (
          <ListingRows shopSlug={shop.slug} listings={listings} />
        )}
      </section>

      <section className="flex flex-col gap-3">
        <SectionHead title={M.addTitle} />
        <Panel className="px-4 py-4">
          <ListingForm shopSlug={shop.slug} hardware={hardware} />
        </Panel>
      </section>

      <section className="flex flex-col gap-3">
        <SectionHead title={CSV_MESSAGES.title} />
        <Panel className="px-4 py-4">
          <ListingCsvForm shopSlug={shop.slug} />
        </Panel>
      </section>
    </Page>
  );
}
