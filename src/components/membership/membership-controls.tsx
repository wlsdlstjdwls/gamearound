"use client";
// 내 멤버십의 해지 예약, 해지 취소 단추(2026-10-27). 누른 순간 상태 표시가 바뀌고 실패하면 되돌린다(AGENTS §6).
// 표시는 전환 밖에서 바꾼다 — 전환 안의 상태 변경은 액션이 끝날 때까지 그려지지 않는다.
import { useState, useTransition } from "react";
import { cancelMembershipAction, resumeMembershipAction } from "@/app/(user)/payments/actions";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { MEMBERSHIP_MESSAGES as M } from "@/lib/membership/messages";

export function MembershipControls({ canceling, untilLabel }: { canceling: boolean; untilLabel: string }) {
  const toast = useToast();
  const [isCanceling, setCanceling] = useState(canceling);
  const [, start] = useTransition();

  const flip = () => {
    const next = !isCanceling;
    setCanceling(next);
    start(async () => {
      const r = await (next ? cancelMembershipAction() : resumeMembershipAction()).catch(() => ({ ok: false as const, error: M.failed }));
      if (!r.ok) {
        setCanceling(!next);
        toast(r.error);
      }
    });
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
      <p className="text-[13px] text-mut">{isCanceling ? M.cancelNote(untilLabel) : null}</p>
      <Button size="sm" variant="secondary" onClick={flip}>
        {isCanceling ? M.resume : M.cancel}
      </Button>
    </div>
  );
}
