import Link from "next/link";
import { Show, SignInButton, UserButton } from "@clerk/nextjs";
import { AUTH_DISABLED } from "@/lib/auth-flag";

function AuthNav() {
  // AUTH_DISABLED: Clerk 컴포넌트는 Provider 없이는 렌더 불가 → 로그인 UI 자체를 숨김
  if (AUTH_DISABLED) return null;
  return (
    <>
      <Show when="signed-in">
        <Link href="/wishlist" className="hover:text-amber-300">위시리스트</Link>
        <Link href="/alerts" className="hover:text-amber-300">알림</Link>
        <Link href="/settings" className="hover:text-amber-300">설정</Link>
        <UserButton />
      </Show>
      <Show when="signed-out">
        <SignInButton mode="modal">
          <button className="rounded-md bg-amber-400 px-3 py-1.5 font-medium text-slate-950 hover:bg-amber-300">로그인</button>
        </SignInButton>
      </Show>
    </>
  );
}

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-slate-800 bg-slate-950/90 backdrop-blur">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center gap-4 px-4">
        <Link href="/" className="flex items-center gap-2 font-bold text-lg">
          <span aria-hidden>🔦</span>
          <span>손전등</span>
        </Link>
        <form action="/search" className="flex-1 max-w-md">
          <label htmlFor="q" className="sr-only">게임 검색</label>
          <input
            id="q"
            name="q"
            type="search"
            placeholder="게임 제목 검색"
            className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-1.5 text-sm outline-none focus:border-amber-400"
          />
        </form>
        <nav className="ml-auto flex items-center gap-3 text-sm">
          <AuthNav />
        </nav>
      </div>
    </header>
  );
}
