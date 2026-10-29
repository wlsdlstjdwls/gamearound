"use client";
// 광고 걸기 판의 "이용권으로 걸기"(2026-10-27, 메이커 멤버십). 누르면 남은 장수가 먼저 줄고 실패하면 되돌린다(AGENTS §6).
// 성공하면 화면을 새로 받아 "지금 광고 중이에요" 줄이 서게 한다.
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { spendBoostCreditAction } from "@/app/(user)/payments/actions";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { MEMBERSHIP_MESSAGES as M } from "@/lib/membership/messages";
import type { PromoTargetKind } from "@/server/db/schema";

export function UseCreditButton({ kind, targetId, credits }: { kind: PromoTargetKind; targetId: string; credits: number }) {
  const toast = useToast();
  const router = useRouter();
  const [left, setLeft] = useState(credits);
  const [, start] = useTransition();

  const use = () => {
    setLeft((n) => n - 1);
    start(async () => {
      const r = await spendBoostCreditAction(kind, targetId).catch(() => ({ ok: false as const, error: M.failed }));
      if (!r.ok) {
        setLeft((n) => n + 1);
        toast(r.error);
        return;
      }
      toast(M.creditUsed);
      router.refresh();
    });
  };

  return (
    <Button size="lg" fullWidth variant="secondary" disabled={left <= 0} onClick={use}>
      {left > 0 ? M.spendCredit(left) : M.noCredit}
    </Button>
  );
}
