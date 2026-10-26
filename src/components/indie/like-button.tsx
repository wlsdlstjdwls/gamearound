"use client";
// 인디 게임 찜 버튼(2026-10-26). 찜 수는 명예의 전당, 슈퍼루키 점수의 재료다(lib/indie/fame).
// 비로그인이면 로그인 팝업 뒤 이어서 찜한다. 누른 순간 바뀌고, 찜 여부는 마운트 뒤 묻는다(상세가 사람마다 같은 HTML 이라서).
import { useEffect, useOptimistic, useState, useTransition } from "react";
import { isIndieLikedAction, toggleIndieLikeAction } from "@/app/(public)/indie/actions";
import { useLoginGate, useResume } from "@/components/auth/login-gate";
import { useSession } from "@/components/auth/session-provider";
import { buttonClass } from "@/components/ui/button";
import { HeartIcon } from "@/components/ui/icons";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/cn";
import { FAME_MESSAGES as M } from "@/lib/indie/fame";

export function IndieLikeButton({ postId, likeCount }: { postId: string; likeCount: number }) {
  const { user } = useSession();
  const gate = useLoginGate();
  const toast = useToast();
  const [state, setState] = useState({ on: false, n: likeCount });
  const [known, setKnown] = useState(false);
  const [shown, setShown] = useOptimistic(state);
  const [, start] = useTransition();
  const action = `indie-like:${postId}`;

  useEffect(() => {
    if (!user) return;
    let alive = true;
    isIndieLikedAction(postId).then((on) => {
      if (!alive) return;
      setState((s) => ({ ...s, on }));
      setKnown(true);
    });
    return () => {
      alive = false;
    };
  }, [postId, user]);

  const toggle = () =>
    start(async () => {
      setShown({ on: !state.on, n: state.n + (state.on ? -1 : 1) });
      const r = await toggleIndieLikeAction(postId);
      if (!r.ok) return toast(r.error);
      setState({ on: r.liked, n: r.likeCount });
      toast(r.liked ? M.wishAdded : M.wishRemoved);
    });
  useResume(action, () => !state.on && toggle(), known);

  return (
    <button type="button" aria-pressed={shown.on} onClick={() => gate(action, toggle)} className={buttonClass({ variant: "secondary", size: "lg", className: cn(shown.on && "border-acc text-acc") })}>
      <HeartIcon size={17} className={shown.on ? "fill-current" : undefined} />
      {shown.on ? M.wished : M.wish}
      <span className="tabular-nums text-dim">{shown.n.toLocaleString("ko-KR")}</span>
    </button>
  );
}
