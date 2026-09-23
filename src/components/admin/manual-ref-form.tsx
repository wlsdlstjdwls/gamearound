"use client";
// 수동 소스 매핑 추가 폼 (§4.2 matched_by=manual)
import { useActionState } from "react";
import { ActionForm } from "@/components/ui/action-form";
import { setManualRefAction } from "@/app/(admin)/admin/actions";
import { ActionStatus, SubmitButton } from "@/components/admin/submit-button";
import { panelClass } from "@/components/ui/page";
import { ADMIN_FIELD } from "@/components/admin/field";
import { FormSelect } from "@/components/ui/select";
export function ManualRefForm({ gameId, sources }: { gameId: string; sources: readonly string[] }) {
  const [state, formAction, submitting] = useActionState(setManualRefAction, null);
  return (
    <ActionForm action={formAction} state={state} pending={submitting} className={panelClass("flex flex-col gap-2.5 p-4")}>
      <input type="hidden" name="gameId" value={gameId} />
      <p className="text-[13px] font-bold text-ink">수동 매핑 추가/덮어쓰기</p>
      <div className="grid gap-2 sm:grid-cols-[8rem_1fr_1fr_auto]">
        <FormSelect
          name="source"
          label="스토어"
          hideLabel
          defaultValue={sources[0]}
          options={sources.map((s) => ({ value: s, label: s }))}
        />
        <input name="externalId" placeholder="외부 ID (예: Steam appid)" required className={ADMIN_FIELD} />
        <input name="url" type="url" placeholder="URL (선택)" className={ADMIN_FIELD} />
        <SubmitButton label="저장" />
      </div>
      <ActionStatus state={state} />
    </ActionForm>
  );
}
