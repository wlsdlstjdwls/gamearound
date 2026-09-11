import Link from "next/link";
import { ROUTES } from "@/lib/routes";
import { AuthNav } from "@/components/auth/auth-nav";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-slate-800 bg-slate-950/90 backdrop-blur">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center gap-3 px-4 sm:gap-4">
        <Link href={ROUTES.home} className="press flex shrink-0 items-center gap-2 text-lg font-bold">
          <span aria-hidden>🔦</span>
          <span>손전등</span>
        </Link>
        <form action={ROUTES.search} className="min-w-0 flex-1 max-w-md">
          <label htmlFor="q" className="sr-only">게임 검색</label>
          <input
            id="q"
            name="q"
            type="search"
            placeholder="게임 제목 검색"
            className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-1.5 text-sm outline-none transition-[border-color,box-shadow] duration-base focus:border-amber-400 focus:shadow-[0_0_0_3px_var(--acc-soft)]"
          />
        </form>
        <nav aria-label="계정" className="ml-auto flex shrink-0 items-center gap-3 text-sm">
          <AuthNav />
        </nav>
      </div>
    </header>
  );
}
