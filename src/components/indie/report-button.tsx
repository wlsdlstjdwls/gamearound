"use client";
// 홍보 글 신고. 사유는 고르기만 한다 — 글로 적게 하면 대부분 비워 두거나 욕을 적고, 관리자가 판정에 쓸 말이 안 남는다.
//
// 비로그인이면 시트 대신 로그인 링크를 건다. 신고는 "한 사람 한 번" 이 문턱의 근거라 사람을 알아야 한다.
import Link from "next/link";
import { useState, useTransition } from "react";
import { reportIndiePostAction } from "@/app/(user)/indie/actions";
import { Button } from "@/components/ui/button";
import { chipClass } from "@/components/ui/chip";
import { FormMessage } from "@/components/ui/form-message";
import { Sheet } from "@/components/ui/sheet";
import { INDIE_REPORT_MESSAGES as R } from "@/lib/indie/messages";
import { signInPath } from "@/lib/routes";

const TRIGGER = "tap inline-flex items-center text-[12.5px] text-dim underline-offset-2 hover:text-ink hover:underline";

export function IndieReportButton({ postId, signedIn, returnTo }: { postId: string; signedIn: boolean; returnTo: string }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<string>(R.reasons[0]);
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();

  if (!signedIn) {
    return (
      <Link href={signInPath(returnTo)} className={TRIGGER}>
        {R.open}
      </Link>
    );
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={TRIGGER}>
        {R.open}
      </button>
      <Sheet title={R.title} open={open} onOpenChange={setOpen}>
        <div className="flex flex-col gap-4">
          <p className="text-[13px] leading-[1.6] text-mut">{R.lead}</p>
          {result ? (
            <FormMessage tone={result.ok ? "success" : "error"} replayKey={result.text}>
              {result.text}
            </FormMessage>
          ) : (
            <>
              <fieldset className="flex flex-col gap-2">
                <legend className="sr-only">{R.reasonLabel}</legend>
                {R.reasons.map((r) => (
                  <label key={r} className={chipClass({ active: reason === r, size: "lg", className: "cursor-pointer justify-start has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ink" })}>
                    <input type="radio" name="reason" value={r} checked={reason === r} onChange={() => setReason(r)} className="sr-only" />
                    {r}
                  </label>
                ))}
              </fieldset>
              <div>
                <Button
                  variant="danger"
                  loading={pending}
                  onClick={() =>
                    start(async () => {
                      const r = await reportIndiePostAction(postId, reason);
                      setResult(r.ok ? { ok: true, text: R.done } : { ok: false, text: r.error });
                    })
                  }
                >
                  {R.submit}
                </Button>
              </div>
            </>
          )}
        </div>
      </Sheet>
    </>
  );
}
