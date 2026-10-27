"use client";
// 결제 내역 줄의 "환불 요청"(2026-10-27). 누르면 사유 칸이 열리고, 보내는 순간 "요청함" 으로 먼저 바뀐다 — 실패하면 되돌리고 문구를 띄운다(AGENTS §6).
// 돈은 이 단추로 빠지지 않는다. 관리자가 확인하고 돌려준다(services/payments/refunds).
import { useState, useTransition } from "react";
import { requestRefundAction } from "@/app/(user)/payments/actions";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";
import { useToast } from "@/components/ui/toast";
import { PAYMENT_MESSAGES as M } from "@/lib/payments/messages";

/** 서버 REFUND_NOTE_MAX 와 같은 값. 서버 모듈을 클라이언트로 끌어오지 않으려고 여기 다시 적고, 서버가 한 번 더 자른다 */
const NOTE_MAX = 300;

export function RefundRequest({ orderId, requested }: { orderId: string; requested: boolean }) {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState(requested);
  const [note, setNote] = useState("");
  const [, start] = useTransition();

  if (done) return <span className="text-[12.5px] text-dim">{M.refundRequested}</span>;
  if (!open)
    return (
      <Button size="sm" variant="secondary" onClick={() => setOpen(true)}>
        {M.refundRequest}
      </Button>
    );
  // 표시는 전환 밖에서 바꾼다 — 전환 안의 상태 변경은 액션이 끝날 때까지 그려지지 않는다(2026-10-27 실측 891ms)
  const send = () => {
    setDone(true);
    start(async () => {
      const r = await requestRefundAction(orderId, note).catch(() => ({ ok: false as const, error: M.failed }));
      if (!r.ok) {
        setDone(false);
        toast(r.error);
      }
    });
  };
  return (
    <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-end">
      <TextField label={M.refundRequest} hideLabel compact placeholder={M.refundRequestPlaceholder} maxLength={NOTE_MAX} value={note} onChange={(e) => setNote(e.target.value)} wrapperClassName="flex-1" />
      <Button size="sm" onClick={send}>
        {M.refundRequestSend}
      </Button>
    </div>
  );
}
