"use client";
// 수동 소스 매핑 추가 폼 (§4.2 matched_by=manual)
import { useActionState } from "react";
import { setManualRefAction } from "@/app/(admin)/admin/actions";
import { ActionStatus, SubmitButton } from "@/components/admin/submit-button";
import { cardClass } from "@/components/ui/page";

const inputCls = "h-8 w-full rounded-[9px] border border-line-strong bg-bg px-3 text-[12.5px] text-ink outline-none transition-colors focus:border-ink focus:bg-surface";

export function ManualRefForm({ gameId, sources }: { gameId: string; sources: readonly string[] }) {
  const [state, formAction] = useActionState(setManualRefAction, null);
  return (
    <form action={formAction} className={cardClass("flex flex-col gap-2.5 p-4")}>
      <input type="hidden" name="gameId" value={gameId} />
      <p className="text-[13px] font-bold text-ink">수동 매핑 추가/덮어쓰기</p>
      <div className="grid gap-2 sm:grid-cols-[8rem_1fr_1fr_auto]">
        <select name="source" className={inputCls} defaultValue={sources[0]}>
          {sources.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <input name="externalId" placeholder="외부 ID (예: Steam appid)" required className={inputCls} />
        <input name="url" type="url" placeholder="URL (선택)" className={inputCls} />
        <SubmitButton label="저장" />
      </div>
      <ActionStatus state={state} />
    </form>
  );
}
