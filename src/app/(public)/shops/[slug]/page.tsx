// /shops/[slug] — 매장 페이지. 설계서 §11 "공개, 유입".
//
// 심사 중(pending)인 매장은 404 다 — 신청만 하고 주소를 뿌리면 승인 전에 매장 페이지가 도는 길이 열린다.
// 정지(suspended)는 404 로 만들지 않고 "쉬는 중" 을 적어 준다. 행을 지우지 않는 설계(§3)와 같은 결이고,
// 밖에 걸린 링크가 어느 날 404 가 되는 것보다 사정을 말하는 쪽이 낫다.
//
// 파는 물건은 판매 중과 품절만 보인다 — 작성 중과 숨김은 매장이 아직 안 내놓기로 한 줄이다
// (services/listings 의 listPublicShopListings 주석).
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Page, PageHead, Card, SectionHead } from "@/components/ui/page";
import { buttonClass } from "@/components/ui/button";
import { ROUTES } from "@/lib/routes";
import { SHOP_DIRECTORY_MESSAGES as M } from "@/lib/shops/messages";
import { findPublicShopBySlug, type ShopPublic } from "@/server/services/shops";
import { listPublicShopListings } from "@/server/services/listings";
import { ListingList } from "@/components/shops/listing-list";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const found = await findPublicShopBySlug(slug);
  if (!found) return { title: M.title };
  return { title: found.shop.name, description: found.shop.description ?? M.lead };
}

/** 주소, 연락처, 영업시간처럼 "있으면 적고 없으면 줄을 안 만드는" 값들 */
function factsOf(shop: ShopPublic): Array<{ label: string; value: string }> {
  const out: Array<{ label: string; value: string }> = [];
  if (shop.addressType === "online_only") out.push({ label: "매장", value: M.onlineOnly });
  else if (shop.address) {
    out.push({ label: "주소", value: shop.addressDetail ? `${shop.address} ${shop.addressDetail}` : shop.address });
  }
  if (shop.phone) out.push({ label: M.phoneLabel, value: shop.phone });
  if (shop.hours) out.push({ label: M.hoursLabel, value: shop.hours });
  return out;
}

export default async function ShopPage({ params }: Props) {
  const { slug } = await params;
  const found = await findPublicShopBySlug(slug);
  if (!found) notFound();
  const { shop, suspended } = found;
  const facts = factsOf(shop);
  const listings = await listPublicShopListings(found.shopId);

  return (
    <Page width="tight" gap={20}>
      <PageHead title={shop.name} note={suspended ? M.suspendedNotice : undefined} />

      {facts.length > 0 && (
        <Card className="flex flex-col gap-2 px-4 py-4">
          <dl className="flex flex-col gap-2">
            {facts.map((f) => (
              <div key={f.label} className="flex gap-3 text-[13px] leading-[1.7]">
                <dt className="w-16 shrink-0 text-dim">{f.label}</dt>
                <dd className="flex-1 text-ink">{f.value}</dd>
              </div>
            ))}
          </dl>
        </Card>
      )}

      {shop.description && (
        <section className="flex flex-col gap-3">
          <SectionHead title={M.aboutLabel} />
          <p className="whitespace-pre-line text-[13px] leading-[1.7] text-mut">{shop.description}</p>
        </section>
      )}

      <section className="flex flex-col gap-3">
        <SectionHead title={M.listingsTitle} note={listings.length > 0 ? `${listings.length}건` : undefined} />
        {listings.length === 0 ? (
          <Card className="px-4 py-6 text-center text-[13px] text-dim">{M.listingsEmpty}</Card>
        ) : (
          <ListingList listings={listings} />
        )}
      </section>

      <div>
        <Link href={ROUTES.shops} className={buttonClass({ variant: "ghost" })}>
          {M.backToDirectory}
        </Link>
      </div>
    </Page>
  );
}
