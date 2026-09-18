// /vendor/[shopSlug]/listings — 판매 목록. 설계서 §11 "매장주".
//
// 목록과 추가 폼을 한 화면에 둔다. 매장이 재고를 적는 일은 "올리고 바로 다음 것을 올리는" 반복이라
// 추가를 다른 화면으로 보내면 그 왕복이 물건 수만큼 는다.
//
// 바코드 스캔과 CSV 는 아직 없다(설계서 §11 은 둘 다 그렸다). 스캐너는 카메라 권한과 기기별
// 차이를 실측해야 하고, CSV 는 매장마다 다른 열 이름을 맞추는 일이 본체다. 손입력이 먼저 서야
// 그 둘이 무엇으로 들어올지 정해진다.
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ListingForm } from "@/components/shops/listing-form";
import { ListingRows } from "@/components/shops/listing-rows";
import { Card, Page, PageHead, SectionHead } from "@/components/ui/page";
import { buttonClass } from "@/components/ui/button";
import { shopPath } from "@/lib/routes";
import { LISTING_MESSAGES as M, VENDOR_MESSAGES } from "@/lib/shops/listing-messages";
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
      </div>

      <section className="flex flex-col gap-3">
        <SectionHead title={M.title} note={listings.length > 0 ? `${listings.length}건` : undefined} />
        {listings.length === 0 ? (
          <Card className="px-4 py-6 text-center text-[13px] text-dim">{M.empty}</Card>
        ) : (
          <ListingRows shopSlug={shop.slug} listings={listings} />
        )}
      </section>

      <section className="flex flex-col gap-3">
        <SectionHead title={M.addTitle} />
        <Card className="px-4 py-4">
          <ListingForm shopSlug={shop.slug} hardware={hardware} />
        </Card>
      </section>
    </Page>
  );
}
