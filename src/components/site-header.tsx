import Link from "next/link";
import { ROUTES } from "@/lib/routes";
import { AuthNav } from "@/components/auth/auth-nav";
import { BrandLockup } from "@/components/ui/logo";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-surface">
      <div className="mx-auto flex w-full max-w-[var(--page-w)] flex-wrap items-center gap-x-4 gap-y-3 px-7 py-4">
        <Link href={ROUTES.home} className="press shrink-0 text-ink">
          <BrandLockup />
        </Link>

        <form action={ROUTES.search} className="min-w-[180px] max-w-[380px] flex-1">
          <label htmlFor="q" className="sr-only">게임 검색</label>
          <div className="flex h-[34px] items-center gap-1.5 rounded-[9px] border border-line-strong bg-bg px-2.5 transition-colors duration-base focus-within:border-ink">
            <span aria-hidden className="text-[13px] text-dim">⌕</span>
            <input
              id="q"
              name="q"
              type="search"
              placeholder="게임 제목 검색"
              className="min-w-0 flex-1 bg-transparent text-[13px] text-ink outline-none placeholder:text-dim"
            />
          </div>
        </form>

        <nav aria-label="주요 메뉴" className="ml-auto flex shrink-0 items-center gap-1 text-[13px]">
          <Link href={ROUTES.game} className="press rounded-lg px-3 py-[7px] text-mut transition-colors hover:text-ink">
            게임 목록
          </Link>
          <Link href={ROUTES.wishlist} className="press hidden rounded-lg px-3 py-[7px] text-mut transition-colors hover:text-ink sm:block">
            위시리스트
          </Link>
          <Link href={ROUTES.alerts} className="press hidden rounded-lg px-3 py-[7px] text-mut transition-colors hover:text-ink sm:block">
            알림
          </Link>
          <AuthNav />
        </nav>
      </div>
    </header>
  );
}
