// /business — 입점 랜딩. 설계서 §11 "공개, 유입".
//
// /shops(매장 찾기)와 따로 두는 이유: 그 화면은 손님이 보고 이 화면은 매장이 본다.
// 한 화면에 둘을 섞으면 "무엇을 하러 온 사람인가" 가 흐려지고 둘 다 못 읽는 글이 된다.
//
// 머리는 인디 목록과 같은 어두운 판이다(ui/ink-hero). 둘 다 "올리러 온 사람" 을 데려오는 랜딩이라
// 같은 얼굴이어야 하고, 회청 면(Panel) 몇 장만 서 있던 예전 모양은 바탕과 거의 구별되지 않았다.
// 혜택 셋과 절차는 흰 마디 카드에 담는다 — 상세 화면과 같은 문법이다.
//
// 없는 것을 있는 것처럼 적지 않는다 — 지금 단계는 A(안내)라 결제도 수수료도 없다(설계서 §12).
import type { Metadata } from "next";
import Link from "next/link";
import { INK_CTA, INK_CTA_GHOST, InkHero, InkHeroHead } from "@/components/ui/ink-hero";
import { Page, Panel, SectionHead, sectionCardClass } from "@/components/ui/page";
import { BUSINESS_MESSAGES as M } from "@/lib/shops/messages";
import { ROUTES } from "@/lib/routes";
import { stagger } from "@/lib/motion";

export const metadata: Metadata = {
  title: M.title,
  description: M.lead,
};

export default function BusinessPage() {
  return (
    <Page gap={22}>
      <InkHero label={M.navLabel}>
        <div className="flex flex-col gap-5">
          <InkHeroHead eyebrow={M.navLabel} title={M.title} lead={M.lead} />
          <div className="flex flex-wrap items-center gap-2">
            <Link href={ROUTES.shopsJoin} className={INK_CTA}>
              {M.ctaJoin}
            </Link>
            <Link href={ROUTES.shopsJoinStatus} className={INK_CTA_GHOST}>
              {M.ctaStatus}
            </Link>
          </div>
        </div>
      </InkHero>

      <ul className="grid gap-4 sm:grid-cols-3">
        {M.points.map((p, i) => (
          <li key={p.title} className="enter-item" style={stagger(i)}>
            <div className={sectionCardClass("flex h-full flex-col gap-2.5")}>
              <span aria-hidden className="flex size-8 items-center justify-center rounded-full bg-acc-soft text-[13px] font-extrabold text-acc">
                {i + 1}
              </span>
              <h2 className="text-[15px] font-bold tracking-[-0.02em] text-ink">{p.title}</h2>
              <p className="text-[13px] leading-[1.7] text-mut">{p.body}</p>
            </div>
          </li>
        ))}
      </ul>

      <section className={sectionCardClass("flex flex-col gap-4")}>
        <SectionHead title={M.stepsTitle} />
        <ol className="flex flex-col gap-2.5">
          {M.steps.map((step, i) => (
            <li key={step} className="flex items-start gap-2.5 text-[13.5px] leading-[1.7] text-ink">
              <span className="mt-[2px] flex size-5 shrink-0 items-center justify-center rounded-full bg-ink text-[11px] font-bold text-on-ink">
                {i + 1}
              </span>
              {step}
            </li>
          ))}
        </ol>
        {/* 결제, 수수료 안내는 절차 판 안의 움푹한 칸이다 — 따로 판을 세우면 혜택 셋과 같은 무게로 읽힌다 */}
        <Panel className="flex flex-col gap-1 px-4 py-3.5">
          <h3 className="text-[13.5px] font-bold text-ink">{M.feeTitle}</h3>
          <p className="text-[12.5px] leading-[1.7] text-mut">{M.feeBody}</p>
        </Panel>
      </section>
    </Page>
  );
}
