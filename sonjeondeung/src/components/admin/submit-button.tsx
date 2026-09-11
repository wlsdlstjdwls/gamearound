"use client";
// 폼 제출 버튼 + 액션 상태 표시 (관리자 폼 공용)
import { useFormStatus } from "react-dom";
import type { AdminActionState } from "@/app/(admin)/admin/actions";

export function SubmitButton({ label, pendingLabel = "처리 중…", variant = "primary" }: { label: string; pendingLabel?: string; variant?: "primary" | "ghost" }) {
  const { pending } = useFormStatus();
  const cls =
    variant === "primary"
      ? "bg-amber-400 text-slate-950 hover:bg-amber-300"
      : "border border-slate-700 text-slate-200 hover:border-amber-400";
  return (
    <button type="submit" disabled={pending} className={`rounded-md px-3 py-1.5 text-sm font-medium disabled:opacity-60 ${cls}`}>
      {pending ? pendingLabel : label}
    </button>
  );
}

export function ActionStatus({ state }: { state: AdminActionState }) {
  if (!state) return null;
  return (
    <p aria-live="polite" className={`text-sm ${state.ok ? "text-emerald-300" : "text-red-400"}`}>
      {state.ok ? state.message : state.error}
    </p>
  );
}
