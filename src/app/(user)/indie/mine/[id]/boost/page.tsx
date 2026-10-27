// /indie/mine/[id]/boost — 내 인디 게임에 광고 걸기(2026-10-27, 기획서 5장 3단계 부스트 단건 결제, 토스페이먼츠 결제위젯).
// 무엇을 사는지(자리, 기간, 광고 표시, 돌아가며 보임)를 먼저 말하고, 값, 결제 수단과 약관 동의(위젯), 결제 단추를 둔다.
// 내 글이 아니면 없는 화면이다(notFound). 공개 전 글은 살 수 없다고 말하고 단추를 세우지 않는다.
// 테스트 키(test_)로 돌면 "실제로 돈이 나가지 않아요" 를 단다 — 운영 키로 바꾸기 전까지 누구도 진짜 결제로 착각하지 않게.
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BoostCheckout } from "@/components/payments/boost-checkout";
import { FormMessage } from "@/components/ui/form-message";
import { Page, PageHead, sectionCardClass } from "@/components/ui/page";
import { formatPrice } from "@/lib/currency";
import { formatDateTime } from "@/lib/format";
import { PAYMENT_MESSAGES as M } from "@/lib/payments/messages";
import { PRODUCTS } from "@/lib/payments/products";
import { requireUserOrRedirect } from "@/server/auth/guards";
import { getMyBoostTarget } from "@/server/services/payments";
import { tossConfigured } from "@/server/payments/toss";

export const metadata: Metadata = { title: M.boostTitle, robots: { index: false } };

/** 브라우저에 내려가는 토스 클라이언트 키(공개해도 되는 키). 비밀 키는 서버만 읽는다(server/payments/toss) */
const CLIENT_KEY_ENV = "NEXT_PUBLIC_TOSS_CLIENT_KEY";

type Props = { params: Promise<{ id: string }> };

export default async function IndieBoostPage({ params }: Props) {
  const user = await requireUserOrRedirect();
  const { id } = await params;
  const target = await getMyBoostTarget(user.id, id).catch(() => null);
  if (!target) notFound();
  const product = PRODUCTS.boost_indie_7d;
  const clientKey = process.env[CLIENT_KEY_ENV]?.trim() ?? "";
  const ready = Boolean(clientKey) && tossConfigured();

  return (
    <Page gap={20} width="tight">
      <PageHead title={M.boostTitle}>
        <p className="text-[14px] text-mut">{M.boostLead}</p>
      </PageHead>

      <section className={sectionCardClass("flex flex-col gap-4")}>
        <div className="flex flex-col gap-1">
          <span className="text-[12.5px] text-dim">{product.name}</span>
          <h2 className="text-[18px] font-bold text-ink">{target.title}</h2>
        </div>
        <ul className="flex flex-col gap-1.5 text-[13.5px] leading-[1.6] text-ink-2">
          {M.boostPoints.map((p) => (
            <li key={p} className="flex gap-2">
              <span aria-hidden className="mt-[9px] size-1 shrink-0 rounded-full bg-acc" />
              {p}
            </li>
          ))}
        </ul>
        {target.boostedUntil && <FormMessage tone="info">{M.currentBoost(formatDateTime(target.boostedUntil))}</FormMessage>}
        <div className="flex items-baseline justify-between border-t border-line pt-4">
          <span className="text-[14px] text-mut">{M.price}</span>
          <span className="text-[22px] font-black tabular-nums text-ink">{formatPrice(product.amount)}</span>
        </div>
        {!target.live ? (
          <FormMessage tone="error">{M.notLive}</FormMessage>
        ) : !ready ? (
          <FormMessage tone="info">{M.notConfigured}</FormMessage>
        ) : (
          <>
            {clientKey.startsWith("test_") && <p className="rounded-xl bg-surface-2 px-4 py-3 text-[13px] text-mut">{M.testMode}</p>}
            <BoostCheckout postId={target.id} clientKey={clientKey} customerKey={user.id} amount={product.amount} />
          </>
        )}
      </section>
    </Page>
  );
}
