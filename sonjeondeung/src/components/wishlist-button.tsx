"use client";
// 계약: 상세 페이지(P3)가 사용. props { gameId, wished, signedIn }. 내부에서 Server Action toggleWishlistAction 호출.
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useTransition } from "react";
import { signInPath } from "@/lib/routes";
import { removeFromWishlistAction, toggleWishlistAction } from "@/app/(user)/wishlist/actions";

export function WishlistButton({ gameId, wished: initial, signedIn }: { gameId: string; wished: boolean; signedIn: boolean }) {
  const [wished, setWished] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const pathname = usePathname();
  if (!signedIn) {
    return (
      <Link href={signInPath(pathname)} className="press rounded-md border border-slate-700 px-3 py-1.5 text-sm hover:border-amber-400">
        ♡ 로그인 후 찜
      </Link>
    );
  }
  return (
    <span className="inline-flex items-center gap-2">
      <button
        type="button"
        disabled={pending}
        aria-pressed={wished}
        onClick={() =>
          start(async () => {
            setError(null);
            const r = await toggleWishlistAction(gameId);
            if (r.ok) setWished(r.wished);
            else setError(r.error);
          })
        }
        className={`rounded-md border px-3 py-1.5 text-sm disabled:opacity-60 ${wished ? "border-amber-400 text-amber-300" : "border-slate-700 hover:border-amber-400"}`}
      >
        {pending ? "…" : wished ? "♥ 찜함" : "♡ 찜하기"}
      </button>
      {error && <span className="text-xs text-red-400">{error}</span>}
    </span>
  );
}

/** /wishlist 목록 카드의 삭제 버튼 */
export function WishlistRemoveButton({ gameId }: { gameId: string }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <span className="inline-flex items-center gap-2">
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          start(async () => {
            setError(null);
            const r = await removeFromWishlistAction(gameId);
            if (!r.ok) setError(r.error);
          })
        }
        className="rounded-md border border-slate-700 px-2.5 py-1 text-xs text-slate-300 hover:border-red-400 hover:text-red-300 disabled:opacity-60"
      >
        {pending ? "삭제 중…" : "삭제"}
      </button>
      {error && <span className="text-xs text-red-400">{error}</span>}
    </span>
  );
}
