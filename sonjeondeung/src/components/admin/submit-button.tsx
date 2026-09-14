"use client";
// 폼 제출 버튼 + 액션 상태 표시 (관리자 폼 공용)
import { useFormStatus } from "react-dom";
import type { AdminActionState } from "@/app/(admin)/admin/actions";

export function SubmitButton({ label, pendingLabel = "처리 중…", variant = "primary" }: { label: string; pendingLabel?: string; variant?: "primary" | "ghost" }) {
  const { pending } = useFormStatus();
  const cls =
    variant === "primary"
      ? "bg-ink font-semibold text-on-ink hover:bg-ink-2"
      : "border border-line-strong bg-surface text-ink hover:border-ink";
  return (
    <button type="submit" disabled={pending} className={`press inline-flex h-8 items-center rounded-[9px] px-3.5 text-[12.5px] transition-colors duration-base disabled:opacity-60 ${cls}`}>
      {pending ? pendingLabel : label}
    </button>
  );
}

export function ActionStatus({ state }: { state: AdminActionState }) {
  if (!state) return null;
  return (
    <p aria-live="polite" className={`text-[12.5px] ${state.ok ? "text-acc" : "text-danger"}`}>
      {state.ok ? state.message : state.error}
    </p>
  );
}
