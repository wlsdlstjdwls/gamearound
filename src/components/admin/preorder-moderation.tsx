"use client";
// 예약 특전 글 한 줄의 판정 — 게임 주소로 잇기(공개까지), 공개, 숨기기. 결과는 줄 옆에 남긴다(indie-moderation 과 같은 이유).
import { useActionState } from "react";
import { moderatePreorderPostAction, type PreorderModerationState } from "@/app/(admin)/admin/preorder/actions";
import { ActionForm, useActionFormPending } from "@/components/ui/action-form";
import { Button } from "@/components/ui/button";
import { MAX_PARAM_LEN } from "@/lib/games-query";
import { PREORDER_MESSAGES } from "@/lib/preorder/messages";
import type { PreorderAdminRowDto } from "@/lib/preorder/dto";

const A = PREORDER_MESSAGES.admin;

function Decide({ decision, label, variant }: { decision: string; label: string; variant: "secondary" | "danger" | "soft" }) {
  const pending = useActionFormPending();
  return (
    <Button type="submit" name="decision" value={decision} size="sm" variant={variant} disabled={pending}>
      {label}
    </Button>
  );
}

export function PreorderModeration({ row }: { row: PreorderAdminRowDto }) {
  const [state, formAction, pending] = useActionState<PreorderModerationState, FormData>(moderatePreorderPostAction, null);
  return (
    <ActionForm action={formAction} state={state} pending={pending} className="flex flex-col gap-2">
      <input type="hidden" name="postId" value={row.id} />
      <label htmlFor={`game-${row.id}`} className="sr-only">
        {A.gameSlug}
      </label>
      <input
        id={`game-${row.id}`}
        name="gameSlug"
        maxLength={MAX_PARAM_LEN}
        defaultValue={row.game?.slug ?? ""}
        placeholder={A.gameSlug}
        className="h-9 w-full rounded-lg border border-line-strong bg-bg px-3 text-[16px] text-ink outline-none focus:border-ink sm:text-[13px]"
      />
      <div className="flex flex-wrap gap-1.5">
        <Decide decision="link" label={A.link} variant="soft" />
        {row.status !== "published" && row.game && <Decide decision="publish" label={A.publish} variant="secondary" />}
        {row.status !== "hidden" && <Decide decision="hide" label={A.hide} variant="danger" />}
      </div>
      {state && <span className={`text-[11.5px] ${state.ok ? "text-ok" : "text-danger"}`}>{state.ok ? state.message : state.error}</span>}
    </ActionForm>
  );
}
