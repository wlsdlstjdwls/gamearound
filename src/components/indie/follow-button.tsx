"use client";
// 개발자 소식 받기(2026-10-27, 기획서 3장 3번). 켜 두면 그 개발자의 새 개발일지, 인디 게임 출시가 알림함으로 온다(services/indie/promo).
// 찜 단추(like-button)와 같은 틀이다: 누른 순간 바뀌고 실패하면 되돌린다, 켜짐 여부는 마운트 뒤 묻는다, 비로그인이면 로그인 뒤 이어서 켠다.
import { useEffect, useOptimistic, useState, useTransition } from "react";
import { isFollowingDeveloperAction, toggleDeveloperFollowAction } from "@/app/(public)/indie/actions";
import { useLoginGate, useResume } from "@/components/auth/login-gate";
import { useSession } from "@/components/auth/session-provider";
import { buttonClass } from "@/components/ui/button";
import { BellIcon } from "@/components/ui/icons";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/cn";
import { INDIE_PROMO_MESSAGES as M } from "@/lib/indie/promo-messages";

export function IndieFollowButton({ developerUserId }: { developerUserId: string }) {
  const { user } = useSession();
  const gate = useLoginGate();
  const toast = useToast();
  const [on, setOn] = useState(false);
  const [known, setKnown] = useState(false);
  const [shown, setShown] = useOptimistic(on);
  const [, start] = useTransition();
  const action = `indie-follow:${developerUserId}`;

  useEffect(() => {
    if (!user) return;
    let alive = true;
    isFollowingDeveloperAction(developerUserId).then((v) => {
      if (!alive) return;
      setOn(v);
      setKnown(true);
    });
    return () => {
      alive = false;
    };
  }, [developerUserId, user]);

  const toggle = () =>
    start(async () => {
      setShown(!on);
      const r = await toggleDeveloperFollowAction(developerUserId);
      if (!r.ok) return toast(r.error);
      setOn(r.following);
      toast(r.following ? M.followed : M.unfollowed);
    });
  useResume(action, () => !on && toggle(), known);

  return (
    <button type="button" aria-pressed={shown} onClick={() => gate(action, toggle)} className={buttonClass({ variant: "secondary", size: "lg", className: cn(shown && "border-acc text-acc") })}>
      <BellIcon size={17} className={shown ? "animate-pop" : undefined} />
      {shown ? M.following : M.follow}
    </button>
  );
}
