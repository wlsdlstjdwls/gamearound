"use client";
// 관리자 결제 줄의 환불 단추(/admin/promotions, 2026-10-27). 전액, 또는 남은 기간 몫(lib/payments/refund).
// 누르는 순간 "환불함" 으로 바뀌고 실패하면 되돌린다(AGENTS §6). 돈이 나가는 일이라 단추 둘을 사유 칸과 함께 접어 두고 "환불" 을 눌러야 펼친다.
import { useState, useTransition } from "react";
import { refundPaymentAction } from "@/app/(admin)/admin/promotions/actions";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";
import { useToast } from "@/components/ui/toast";
import { formatPrice } from "@/lib/currency";
import { PAYMENT_MESSAGES as M } from "@/lib/payments/messages";

/** 토스 cancelReason 상한(서버 REFUND_REASON_MAX 와 같다) */
const REASON_MAX = 200;

export function RefundControls({ orderId, amount, prorated }: { orderId: string; amount: number; prorated: number }) {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [, start] = useTransition();

  if (done) return <span className="text-[12.5px] text-dim">{done}</span>;
  if (!open)
    return (
      <Button size="sm" variant="secondary" onClick={() => setOpen(true)}>
        {M.adminRefund}
      </Button>
    );
  // 표시는 전환 밖에서 바꾼다 — 전환 안의 상태 변경은 액션이 끝날 때까지 그려지지 않는다
  const run = (mode: "full" | "prorated", expected: number) => {
    setDone(M.adminRefundDone(formatPrice(expected)));
    start(async () => {
      const r = await refundPaymentAction(orderId, mode, reason).catch(() => ({ ok: false as const, error: M.failed }));
      if (!r.ok) {
        setDone(null);
        toast(r.error);
      } else setDone(M.adminRefundDone(formatPrice(r.amount)));
    });
  };
  return (
    <div className="flex w-full flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end">
      <TextField label={M.adminRefundReason} hideLabel compact placeholder={M.adminRefundReason} maxLength={REASON_MAX} value={reason} onChange={(e) => setReason(e.target.value)} wrapperClassName="flex-1" />
      <Button size="sm" variant="secondary" onClick={() => run("full", amount)}>
        {M.adminRefundFull}
      </Button>
      {prorated > 0 && prorated < amount && (
        <Button size="sm" variant="secondary" onClick={() => run("prorated", prorated)}>
          {M.adminRefundProrated(formatPrice(prorated))}
        </Button>
      )}
    </div>
  );
}
