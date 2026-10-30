"use client";
// 입점 신청 취소 단추(2026-10-30). 되돌릴 수 없어 공용 확인 팝업(askConfirm)으로 한 번 묻고, 지운 뒤 신청 화면으로 보낸다.
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { withdrawShopApplicationAction } from "@/app/(user)/shops/join/actions";
import { Button } from "@/components/ui/button";
import { askConfirm } from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/ui/toast";
import { ROUTES } from "@/lib/routes";
import { SHOP_MESSAGES as M } from "@/lib/shops/messages";

export function WithdrawApplicationButton() {
  const router = useRouter();
  const toast = useToast();
  const [pending, start] = useTransition();
  const withdraw = async () => {
    const ok = await askConfirm(M.withdrawBody, { title: M.withdrawTitle, confirmLabel: M.withdrawYes, tone: "danger" });
    if (!ok) return;
    start(async () => {
      const r = await withdrawShopApplicationAction();
      if (!r.ok) return toast(r.error);
      toast(M.withdrawn);
      router.push(ROUTES.shopsJoin);
    });
  };
  return (
    <Button variant="ghost" loading={pending} onClick={withdraw} className="text-danger">
      {M.withdraw}
    </Button>
  );
}
