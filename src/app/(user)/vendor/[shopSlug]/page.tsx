// /vendor/[shopSlug] — 매장 요약 자리. 설계서 §11 은 여기에 품절 임박, 오래된 재고, 조회수를 그렸다.
//
// 아직 세우지 않는다. 셋 다 지금 답할 수 없는 값이다 — 조회수를 세는 자리가 없고,
// "오래된 재고" 는 재고 이력(shop_stock_events)이 한 회차 이상 쌓여야 뜻이 생긴다.
// 빈 요약 화면을 먼저 세우면 매장주가 매번 아무것도 없는 칸을 한 번 거쳐 판매 목록으로 간다.
// 값이 생기면 이 파일이 화면이 된다.
import { redirect } from "next/navigation";
import { vendorListingsPath } from "@/lib/routes";

type Props = { params: Promise<{ shopSlug: string }> };

export default async function VendorShopPage({ params }: Props) {
  const { shopSlug } = await params;
  redirect(vendorListingsPath(shopSlug));
}
