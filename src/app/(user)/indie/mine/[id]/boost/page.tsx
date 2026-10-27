// /indie/mine/[id]/boost — 내 인디 게임에 광고 걸기(2026-10-27, 기획서 5장 3단계 부스트 단건 결제, 토스페이먼츠 결제위젯).
// 판은 components/payments/boost-purchase. 내 글이 아니면 없는 화면이다(notFound).
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BoostPurchase } from "@/components/payments/boost-purchase";
import { Page, PageHead } from "@/components/ui/page";
import { PRODUCT_COPY } from "@/lib/payments/messages";
import { requireUserOrRedirect } from "@/server/auth/guards";
import { getMyBoostTarget } from "@/server/services/payments";
import { getMyMembership } from "@/server/services/membership";

const PRODUCT = "boost_indie_7d";
const COPY = PRODUCT_COPY[PRODUCT];

export const metadata: Metadata = { title: COPY.title, robots: { index: false } };

type Props = { params: Promise<{ id: string }> };

export default async function IndieBoostPage({ params }: Props) {
  const user = await requireUserOrRedirect();
  const { id } = await params;
  const [target, membership] = await Promise.all([getMyBoostTarget(user.id, PRODUCT, id).catch(() => null), getMyMembership(user.id).catch(() => null)]);
  if (!target) notFound();
  return (
    <Page gap={20} width="tight">
      <PageHead title={COPY.title}>
        <p className="text-[14px] text-mut">{COPY.lead}</p>
      </PageHead>
      <BoostPurchase product={PRODUCT} target={target} customerKey={user.id} credits={membership?.usableCredits ?? 0} />
    </Page>
  );
}
