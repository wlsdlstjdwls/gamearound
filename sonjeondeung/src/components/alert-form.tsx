"use client";
// 가격 알림 폼/컨트롤 (클라이언트). Server Action은 src/app/(user)/alerts/actions.ts
import { useActionState, useState, useTransition } from "react";
import { useFormStatus } from "react-dom";
import { createAlertAction, deleteAlertAction, toggleAlertAction, type ActionState } from "@/app/(user)/alerts/actions";
import { PLATFORM_LABEL } from "@/lib/format";

export const PLATFORM_OPTIONS: { value: string; label: string }[] = [
  { value: "all", label: "전체 플랫폼" },
  ...(["steam", "ps5", "ps4", "xbox", "switch", "switch2"] as const).map((p) => ({ value: p, label: PLATFORM_LABEL[p] })),
];

function SubmitButton({ label, pendingLabel }: { label: string; pendingLabel: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-md bg-amber-400 px-4 py-2 text-sm font-medium text-slate-950 hover:bg-amber-300 disabled:opacity-60"
    >
      {pending ? pendingLabel : label}
    </button>
  );
}

export function StatusLine({ state }: { state: ActionState }) {
  if (!state) return null;
  return (
    <p aria-live="polite" className={`text-sm ${state.ok ? "text-emerald-300" : "text-red-400"}`}>
      {state.ok ? state.message : state.error}
    </p>
  );
}

/** 새 알림 생성 폼 — /alerts?game=<slug> 로 진입했을 때 상단에 노출 */
export function AlertForm({ game }: { game: { id: string; slug: string; title: string } }) {
  const [state, formAction] = useActionState(createAlertAction, null);
  return (
    <form action={formAction} className="space-y-3 rounded-lg border border-amber-400/40 bg-slate-900/60 p-4">
      <input type="hidden" name="gameId" value={game.id} />
      <h2 className="font-semibold">
        <span className="text-amber-300">{game.title}</span> 할인 알림 만들기
      </h2>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="mb-1 block text-slate-400">플랫폼</span>
          <select name="platform" defaultValue="all" className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 outline-none focus:border-amber-400">
            {PLATFORM_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-slate-400">최소 할인율(%)</span>
          <input
            type="number"
            name="minDiscountPct"
            defaultValue={1}
            min={1}
            max={100}
            step={1}
            required
            className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 outline-none focus:border-amber-400"
          />
          <span className="mt-1 block text-xs text-slate-500">1 = 할인이 시작되면 알림</span>
        </label>
      </div>
      <div className="flex items-center gap-3">
        <SubmitButton label="알림 저장" pendingLabel="저장 중…" />
        <StatusLine state={state} />
      </div>
    </form>
  );
}

/** 목록 행의 활성 토글·삭제 버튼 */
export function AlertItemControls({ id, isActive }: { id: string; isActive: boolean }) {
  const [pending, start] = useTransition();
  // 성공 시엔 revalidate로 화면이 갱신되므로 에러만 표시
  const [state, setState] = useState<ActionState>(null);
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        role="switch"
        aria-checked={isActive}
        disabled={pending}
        onClick={() => start(async () => setState(await toggleAlertAction(id)))}
        className={`rounded-md border px-2.5 py-1 text-xs disabled:opacity-60 ${isActive ? "border-amber-400 text-amber-300" : "border-slate-700 text-slate-400 hover:border-slate-500"}`}
      >
        {isActive ? "활성" : "비활성"}
      </button>
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          if (!confirm("이 알림을 삭제할까요?")) return;
          start(async () => setState(await deleteAlertAction(id)));
        }}
        className="rounded-md border border-slate-700 px-2.5 py-1 text-xs text-slate-300 hover:border-red-400 hover:text-red-300 disabled:opacity-60"
      >
        삭제
      </button>
      {state && !state.ok && <span className="text-xs text-red-400">{state.error}</span>}
    </div>
  );
}
