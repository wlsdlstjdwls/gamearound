"use client";
// 초대 수락 버튼 — Server Action 은 app/(user)/vendor/invite/[token]/actions.ts. 성공하면 액션이 판매 목록으로 보낸다.
import { useActionState } from "react";
import { acceptInviteAction, type AcceptState } from "@/app/(user)/vendor/invite/[token]/actions";
import { ActionForm, useActionFormPending } from "@/components/ui/action-form";
import { Button } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/form-message";
import { STAFF_MESSAGES as M } from "@/lib/shops/staff-messages";

function SubmitButton() {
  const pending = useActionFormPending();
  return (
    <Button type="submit" loading={pending} loadingLabel="합류하는 중">
      {M.accept}
    </Button>
  );
}

export function InviteAccept({ token }: { token: string }) {
  const [state, dispatch, pending] = useActionState<AcceptState, FormData>(acceptInviteAction.bind(null, token), null);
  return (
    <ActionForm action={dispatch} state={state} pending={pending} resetOnSuccess={false} className="flex flex-col gap-3">
      {state && !state.ok && (
        <FormMessage tone="error" replayKey={state.error}>
          {state.error}
        </FormMessage>
      )}
      <div>
        <SubmitButton />
      </div>
    </ActionForm>
  );
}
