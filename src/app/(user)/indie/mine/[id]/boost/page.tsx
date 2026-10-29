// /indie/mine/[id]/boost — 내 인디 게임에 광고 걸기(2026-10-27, 기획서 5장 3단계 부스트 단건 결제, 토스페이먼츠 결제위젯).
// 판은 components/payments/boost-purchase. 내 글이 아니면 없는 화면이다(notFound).
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BoostPurchase } from "@/components/payments/boost-purchase";
import { Page, PageHead } from "@/components/ui/page";
import { firstParam } from "@/lib/games-query";
import { PRODUCT_COPY } from "@/lib/payments/messages";
import { PLAN_PARAM, readPlanChoice } from "@/lib/payments/products";
import { requireUserOrRedirect } from "@/server/auth/guards";
import { getMyBoostTarget, listMyLiveTargets } from "@/server/services/payments";
import { getMyMembership } from "@/server/services/membership";

/** 이 화면의 글 갈래. 고를 상품은 이 글의 자리를 품은 판매 중 상품이다(components/payments/boost-purchase) */
const KIND = "indie_post";
const COPY = PRODUCT_COPY[KIND];

export const metadata: Metadata = { title: COPY.title, robots: { index: false } };

type Props = { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function IndieBoostPage({ params, searchParams }: Props) {
  const user = await requireUserOrRedirect();
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  // 같이 사기의 짝 후보를 못 읽으면 낱개만 판다
  const [target, membership, pairs] = await Promise.all([
    getMyBoostTarget(user.id, KIND, id).catch(() => null),
    getMyMembership(user.id).catch(() => null),
    listMyLiveTargets(user.id, "board_post").catch(() => []),
  ]);
  if (!target) notFound();
  return (
    <Page gap={20} width="tight">
      <PageHead title={COPY.title}>
        <p className="text-[14px] text-mut">{COPY.lead}</p>
      </PageHead>
      <BoostPurchase kind={KIND} target={target} customerKey={user.id} credits={membership?.usableCredits ?? 0} pairs={pairs} initialPlan={readPlanChoice(firstParam(sp[PLAN_PARAM]))} />
    </Page>
  );
}
