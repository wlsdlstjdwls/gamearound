"use client";
// 찜 버튼(기획서 v2.0 S-05, 6.1 "찜"). 토글이고, 비로그인이면 로그인 팝업 뒤 이어서 찜한다(auth/login-gate).
// 2026-09-21 에 숨겼던 버튼을 기획서 v2.0(2026-10-26)이 되살렸다 — 내 찜 목록(S-25)과 짝이다.
//
// 찜 여부는 마운트 뒤 묻는다(isWishedAction). 상세 화면은 게임 단위로 캐시돼 사람마다 다른 값을 서버가 그려 줄 수 없다.
// 누른 순간 바뀐다(AGENTS §6). 실패하면 전환이 끝나며 저절로 되돌아가고 토스트가 이유를 말한다.
import { useEffect, useOptimistic, useState, useTransition } from "react";
import { useLoginGate, useResume } from "@/components/auth/login-gate";
import { useSession } from "@/components/auth/session-provider";
import { buttonClass } from "@/components/ui/button";
import { askConfirm } from "@/components/ui/confirm-dialog";
import { HeartIcon } from "@/components/ui/icons";
import { useToast } from "@/components/ui/toast";
import { isWishedAction, removeFromWishlistAction, toggleWishlistAction } from "@/app/(user)/wishlist/actions";
import { WISHLIST_MESSAGES as M } from "@/lib/wishlist/messages";

export function WishlistButton({ gameId, className }: { gameId: string; className?: string }) {
  const { user } = useSession();
  const [wished, setWished] = useState(false);
  const [known, setKnown] = useState(false);
  const [, start] = useTransition();
  const [shown, setShown] = useOptimistic(wished);
  const gate = useLoginGate();
  const toast = useToast();
  const action = `wish:${gameId}`;

  useEffect(() => {
    if (!user) return;
    let alive = true;
    isWishedAction(gameId).then((w) => {
      if (!alive) return;
      setWished(w);
      setKnown(true);
    });
    return () => {
      alive = false;
    };
  }, [gameId, user]);

  const toggle = (next: boolean) =>
    start(async () => {
      setShown(next);
      const r = await toggleWishlistAction(gameId);
      if (!r.ok) return toast(r.error);
      setWished(r.wished);
      toast(r.wished ? M.added : M.removed);
    });

  // 로그인 뒤 이어하기 — 이미 찜한 게임이면 아무것도 안 한다(토글이라 한 번 더 누르면 풀린다)
  useResume(action, () => {
    if (!wished) toggle(true);
  }, known);

  return (
    <button
      type="button"
      aria-pressed={shown}
      onClick={() => gate(action, () => toggle(!wished))}
      className={buttonClass({ variant: shown ? "picked" : "secondary", size: "lg", className })}
    >
      <HeartIcon size={17} className={shown ? "animate-pop fill-current" : undefined} />
      {shown ? M.on : M.off}
    </button>
  );
}

/** /wishlist 목록 카드의 삭제 버튼 — 카드 우상단 ✕. 누르면 askConfirm 으로 한 번 묻는다(2026-10-30 사용자) */
export function WishlistRemoveButton({ gameId, title }: { gameId: string; title: string }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <span className="inline-flex items-center gap-1.5">
      {error && <span className="text-[11px] text-danger">{error}</span>}
      <button
        type="button"
        disabled={pending}
        aria-label={M.removeLabel}
        onClick={async () => {
          const ok = await askConfirm(M.removeConfirm(title), {
            title: M.removeConfirmTitle,
            confirmLabel: M.removeConfirmLabel,
            tone: "danger",
          });
          if (!ok) return;
          start(async () => {
            setError(null);
            const r = await removeFromWishlistAction(gameId);
            if (!r.ok) setError(r.error);
          });
        }}
        className="press flex h-6 w-6 items-center justify-center rounded-md text-[12px] text-dim transition-colors hover:bg-surface-2 hover:text-ink disabled:opacity-60"
      >
        {pending ? "…" : "✕"}
      </button>
    </span>
  );
}
