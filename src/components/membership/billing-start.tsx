"use client";
// 메이커 멤버십 시작 — 토스 카드 등록 창(정기결제, 2026-10-27). 등록이 끝나면 토스가 성공, 실패 주소로 페이지를 넘기고
// 서버가 빌링키를 받아 첫 달을 청구한다(api/payments/toss/billing). 이 단추는 돈을 직접 움직이지 않는다.
// customerKey 는 우리 사용자 id 다 — 성공 주소에서 로그인한 사람과 같은지 다시 본다.
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/form-message";
import { isUserCancel, loadTossSdk } from "@/components/payments/toss-sdk";
import { MEMBERSHIP_MESSAGES as M } from "@/lib/membership/messages";
import { TOSS_BILLING_FAIL_PATH, TOSS_BILLING_SUCCESS_PATH } from "@/lib/routes";

export function BillingStart({ clientKey, customerKey }: { clientKey: string; customerKey: string }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const open = () =>
    start(async () => {
      setError(null);
      try {
        const TossPayments = await loadTossSdk();
        await TossPayments(clientKey)
          .payment({ customerKey })
          .requestBillingAuth({
            method: "CARD",
            successUrl: `${window.location.origin}${TOSS_BILLING_SUCCESS_PATH}`,
            failUrl: `${window.location.origin}${TOSS_BILLING_FAIL_PATH}`,
          });
      } catch (e) {
        if (isUserCancel(e)) return;
        setError((e as { message?: string } | null)?.message ?? M.sdkFailed);
      }
    });

  return (
    <div className="flex flex-col gap-3">
      {error && <FormMessage tone="error">{error}</FormMessage>}
      <Button size="lg" fullWidth loading={pending} onClick={open}>
        {M.start}
      </Button>
    </div>
  );
}
