// 메뉴는 있지만 화면이 아직 없는 칸의 공통 도착지(2026-10-26 개편 1단계).
// 게시판, 라운지, 명예의 전당, 슈퍼루키가 차례로 만들어지면 그 칸의 page.tsx 가 이 컴포넌트를 버린다.
//
// 검색에 걸리지 않게 noindex 를 붙인다 — 빈 화면이 색인되면 나중에 진짜 화면이 서도 한동안 빈 설명으로 노출된다.
import type { Metadata } from "next";
import Link from "next/link";
import { buttonClass } from "@/components/ui/button";
import { Page, PageHead } from "@/components/ui/page";
import { COMING_SOON_MESSAGES as M } from "@/lib/coming-soon/messages";
import { NAV_SECTIONS } from "@/lib/nav";
import { ROUTES } from "@/lib/routes";

function lookup(href: string) {
  for (const section of NAV_SECTIONS) {
    const sub = section.subs.find((s) => s.href === href);
    if (sub) return { section: section.label, title: sub.label };
  }
  return { section: null, title: M.fallbackTitle };
}

export function comingSoonMetadata(href: string): Metadata {
  return { title: lookup(href).title, description: M.lead[href], robots: { index: false, follow: true } };
}

export function ComingSoon({ href }: { href: string }) {
  const { section, title } = lookup(href);
  return (
    <Page gap={24}>
      <PageHead title={title} note={section ?? undefined} />
      <div role="status" className="flex flex-col items-start gap-3 rounded-[var(--radius-panel)] bg-surface px-6 py-8 shadow-hair sm:px-8">
        <span className="rounded-full bg-acc-soft px-2.5 py-1 text-[12px] font-bold text-acc">{M.badge}</span>
        <p className="text-[17px] font-extrabold tracking-[-0.02em] text-ink">{M.title}</p>
        {M.lead[href] && <p className="max-w-[540px] text-[14px] leading-[1.7] text-mut">{M.lead[href]}</p>}
        <Link href={ROUTES.game} className={`${buttonClass({ variant: "secondary", size: "sm" })} mt-1`}>
          {M.action}
        </Link>
      </div>
    </Page>
  );
}
