"use client";
// 수동 소스 매핑 추가 폼 (§4.2 matched_by=manual)
import { useActionState } from "react";
import { setManualRefAction } from "@/app/(admin)/admin/actions";
import { ActionStatus, SubmitButton } from "@/components/admin/submit-button";

const inputCls = "w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-1.5 text-sm outline-none focus:border-amber-400";

export function ManualRefForm({ gameId, sources }: { gameId: string; sources: readonly string[] }) {
  const [state, formAction] = useActionState(setManualRefAction, null);
  return (
    <form action={formAction} className="space-y-2 rounded-md border border-slate-800 p-3">
      <input type="hidden" name="gameId" value={gameId} />
      <p className="text-sm font-medium">수동 매핑 추가/덮어쓰기</p>
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
