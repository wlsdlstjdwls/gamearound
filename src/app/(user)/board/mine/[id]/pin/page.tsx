// /board/mine/[id]/pin — 내 홍보 글을 게시판 홍보 목록 위에 고정(2026-10-27, 기획서 4.2 "게시판 홍보 목록 위 고정", 단건 결제).
// 판은 components/payments/boost-purchase. 내 홍보 글이 아니면 없는 화면이다(notFound) — 리뷰, 공략 글은 이 자리에 못 건다.
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BoostPurchase } from "@/components/payments/boost-purchase";
import { Page, PageHead } from "@/components/ui/page";
import { isPostId } from "@/lib/community/constants";
import { PRODUCT_COPY } from "@/lib/payments/messages";
import { requireUserOrRedirect } from "@/server/auth/guards";
import { getMyBoostTarget, listMyLiveTargets } from "@/server/services/payments";
import { getMyMembership } from "@/server/services/membership";

const PRODUCT = "pin_promo_7d";
const COPY = PRODUCT_COPY[PRODUCT];

export const metadata: Metadata = { title: COPY.title, robots: { index: false } };

type Props = { params: Promise<{ id: string }> };

export default async function BoardPinPage({ params }: Props) {
  const user = await requireUserOrRedirect();
  const { id } = await params;
  if (!isPostId(id)) notFound();
  // 같이 사기의 짝 후보를 못 읽으면 낱개만 판다
  const [target, membership, pairs] = await Promise.all([
    getMyBoostTarget(user.id, PRODUCT, id).catch(() => null),
    getMyMembership(user.id).catch(() => null),
    listMyLiveTargets(user.id, "indie_post").catch(() => []),
  ]);
  if (!target) notFound();
  return (
    <Page gap={20} width="tight">
      <PageHead title={COPY.title}>
        <p className="text-[14px] text-mut">{COPY.lead}</p>
      </PageHead>
      <BoostPurchase product={PRODUCT} target={target} customerKey={user.id} credits={membership?.usableCredits ?? 0} pairs={pairs} />
    </Page>
  );
}
