// /business — 입점 랜딩. 설계서 §11 "공개, 유입".
//
// /shops(매장 찾기)와 따로 두는 이유: 그 화면은 손님이 보고 이 화면은 매장이 본다.
// 한 화면에 둘을 섞으면 "무엇을 하러 온 사람인가" 가 흐려지고 둘 다 못 읽는 글이 된다.
//
// 없는 것을 있는 것처럼 적지 않는다 — 지금 단계는 A(안내)라 결제도 수수료도 없다(설계서 §12).
import type { Metadata } from "next";
import Link from "next/link";
import { Page, PageHead, Panel, SectionHead } from "@/components/ui/page";
import { buttonClass } from "@/components/ui/button";
import { BUSINESS_MESSAGES } from "@/lib/shops/messages";
import { JoinSoonButton } from "@/components/shops/join-soon";
import { ROUTES } from "@/lib/routes";
import { stagger } from "@/lib/motion";

export const metadata: Metadata = {
  title: BUSINESS_MESSAGES.title,
  description: BUSINESS_MESSAGES.lead,
};

export default function BusinessPage() {
  return (
    <Page width="tight" gap={20}>
      <PageHead title={BUSINESS_MESSAGES.title} note={BUSINESS_MESSAGES.lead} />

      {/* 신청은 아직 열지 않았다(2026-09-21) — 버튼을 지우지 않고 사유를 말하는 시트로 바꿨다.
          되살릴 때는 이 자리를 ROUTES.shopsJoin 링크로 되돌린다(lib/shops/messages 의 soon* 주석) */}
      <div className="flex flex-wrap gap-2">
        <JoinSoonButton />
        <Link href={ROUTES.shopsJoinStatus} className={buttonClass({ variant: "ghost" })}>
          {BUSINESS_MESSAGES.ctaStatus}
        </Link>
      </div>

      <ul className="grid gap-3 sm:grid-cols-3">
        {BUSINESS_MESSAGES.points.map((p, i) => (
          <li key={p.title} className="enter-item" style={stagger(i)}>
            <Panel className="flex h-full flex-col gap-2 px-4 py-4">
              <h2 className="text-[14px] font-bold text-ink">{p.title}</h2>
              <p className="text-[13px] leading-[1.7] text-mut">{p.body}</p>
            </Panel>
          </li>
        ))}
      </ul>

      <Panel className="flex flex-col gap-2 px-4 py-4">
        <h2 className="text-[14px] font-bold text-ink">{BUSINESS_MESSAGES.feeTitle}</h2>
        <p className="text-[13px] leading-[1.7] text-mut">{BUSINESS_MESSAGES.feeBody}</p>
      </Panel>

      <section className="flex flex-col gap-3">
        <SectionHead title={BUSINESS_MESSAGES.stepsTitle} />
        <ol className="flex flex-col gap-2">
          {BUSINESS_MESSAGES.steps.map((step, i) => (
            <li key={step} className="flex items-start gap-2.5 text-[13px] leading-[1.7] text-mut">
              <span className="mt-[3px] flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-surface-2 text-[11px] font-bold text-ink">
                {i + 1}
              </span>
              {step}
            </li>
          ))}
        </ol>
      </section>
    </Page>
  );
}
