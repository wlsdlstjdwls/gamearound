"use client";
// 인디 홍보 글 한 줄의 판정 버튼 — 숨기기(사유), 되살리기, 게임 연결 확인과 끊기.
// 결과를 줄 옆에 그대로 붙인다(company-resolve-button 과 같은 이유 — 큐 화면에서 무엇을 눌렀는지가 남아야 한다).
import { useActionState } from "react";
import { moderateIndiePostAction, type IndieModerationState } from "@/app/(admin)/admin/indie/actions";
import { ActionForm, useActionFormPending } from "@/components/ui/action-form";
import { Button } from "@/components/ui/button";
import { INDIE_HIDE_REASON_MAX } from "@/lib/indie/constants";
import { INDIE_ADMIN_MESSAGES as A } from "@/lib/indie/messages";
import type { IndieAdminRowDto } from "@/lib/indie/dto";

function Decide({ decision, label, variant }: { decision: string; label: string; variant: "secondary" | "danger" | "soft" }) {
  const pending = useActionFormPending();
  return (
    <Button type="submit" name="decision" value={decision} size="sm" variant={variant} disabled={pending}>
      {label}
    </Button>
  );
}

export function IndieModeration({ row }: { row: IndieAdminRowDto }) {
  const [state, formAction, pending] = useActionState<IndieModerationState, FormData>(moderateIndiePostAction, null);
  const linkPending = row.game !== null && !row.game.verified;

  return (
    <ActionForm action={formAction} state={state} pending={pending} className="flex flex-col gap-2">
      <input type="hidden" name="postId" value={row.id} />
      {row.status === "published" && (
        <>
          <label htmlFor={`hide-${row.id}`} className="sr-only">
            {A.hideReason}
          </label>
          <input
            id={`hide-${row.id}`}
            name="reason"
            maxLength={INDIE_HIDE_REASON_MAX}
            placeholder={A.hideReasonPlaceholder}
            className="h-9 w-full rounded-lg border border-line-strong bg-bg px-3 text-[16px] text-ink outline-none focus:border-ink sm:text-[13px]"
          />
        </>
      )}
      <div className="flex flex-wrap gap-1.5">
        {row.status === "published" ? <Decide decision="hide" label={A.hide} variant="danger" /> : <Decide decision="restore" label={A.restore} variant="secondary" />}
        {linkPending && <Decide decision="verify_link" label={A.verifyLink} variant="soft" />}
        {row.game && <Decide decision="reject_link" label={A.rejectLink} variant="secondary" />}
      </div>
      {state && <span className={`text-[11.5px] ${state.ok ? "text-ok" : "text-danger"}`}>{state.ok ? state.message : state.error}</span>}
    </ActionForm>
  );
}
