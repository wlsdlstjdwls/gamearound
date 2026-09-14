"use client";
// 계약: 상세 페이지(P3)가 사용. props { gameId, wished, signedIn }. 내부에서 Server Action toggleWishlistAction 호출.
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useTransition } from "react";
import { signInPath } from "@/lib/routes";
import { buttonClass } from "@/components/ui/button";
import { removeFromWishlistAction, toggleWishlistAction } from "@/app/(user)/wishlist/actions";

export function WishlistButton({ gameId, wished: initial, signedIn }: { gameId: string; wished: boolean; signedIn: boolean }) {
  const [wished, setWished] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const pathname = usePathname();

  if (!signedIn) {
    return (
      <Link href={signInPath(pathname)} className={buttonClass({ variant: "secondary" })}>
        ♡ 위시리스트
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
        className={buttonClass({ variant: "secondary", className: wished ? "border-ink font-semibold" : undefined })}
      >
        {pending ? "…" : wished ? "♥ 위시리스트" : "♡ 위시리스트"}
      </button>
      {error && <span className="text-[11.5px] text-danger">{error}</span>}
    </span>
  );
}

/** /wishlist 목록 카드의 삭제 버튼 — 카드 우상단 ✕ */
export function WishlistRemoveButton({ gameId }: { gameId: string }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <span className="inline-flex items-center gap-1.5">
      {error && <span className="text-[11px] text-danger">{error}</span>}
      <button
        type="button"
        disabled={pending}
        aria-label="위시리스트에서 제거"
        onClick={() =>
          start(async () => {
            setError(null);
            const r = await removeFromWishlistAction(gameId);
            if (!r.ok) setError(r.error);
          })
        }
        className="press flex h-6 w-6 items-center justify-center rounded-md text-[12px] text-dim transition-colors hover:bg-surface-2 hover:text-ink disabled:opacity-60"
      >
        {pending ? "…" : "✕"}
      </button>
    </span>
  );
}
