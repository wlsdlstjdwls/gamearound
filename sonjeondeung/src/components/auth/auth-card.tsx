// 인증 화면 셸 — 모바일은 여백만 있는 풀블리드, sm 이상은 가운데 카드. 브랜드 마크 + 제목 + 설명 → 폼.
import Link from "next/link";
import type { ReactNode } from "react";
import { stagger } from "@/lib/motion";
import { ROUTES } from "@/lib/routes";

export function AuthCard({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-md py-4 sm:py-10">
      <div className="sm:rounded-[var(--radius-xl)] sm:border sm:border-line sm:bg-surface/70 sm:p-8 sm:shadow-[0_30px_70px_-44px_rgba(0,0,0,0.9)] sm:backdrop-blur">
        <header className="mb-6 text-center">
          <Link href={ROUTES.home} aria-label="손전등 홈" className="reveal inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-acc/15 text-3xl shadow-[0_0_0_1px_var(--acc-soft),0_12px_30px_-12px_var(--acc-glow)]" style={stagger(0)}>
            <span aria-hidden>🔦</span>
          </Link>
          <h1 className="reveal mt-4 text-2xl font-bold tracking-tight text-ink" style={stagger(1)}>
            {title}
          </h1>
          <p className="reveal mt-1.5 text-sm text-mut" style={stagger(2)}>
            {subtitle}
          </p>
        </header>
        {children}
      </div>
    </div>
  );
}
