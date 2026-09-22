"use client";
// 폼 제출 버튼 + 액션 상태 표시 (관리자 폼 공용)
//
// 모양은 공용 Button 이 정한다(AGENTS §3). 손으로 그리던 때는 높이가 32px 로 박혀 있어
// 손가락 기기에서 누를 수 없었다 — size="sm" 은 같은 32px 을 쓰되 터치 화면에서만 44px 로 벌린다.
// 좁은 화면에서는 칸을 꽉 채운다: 이 버튼들은 한 줄짜리 그리드의 마지막 칸이라, 줄이 세로로 갈리면
// 혼자 왼쪽에 붙어 앞 칸의 이어진 조각처럼 보였다.
import { useFormStatus } from "react-dom";
import { buttonClass } from "@/components/ui/button";
import type { AdminActionState } from "@/app/(admin)/admin/actions";

export function SubmitButton({ label, pendingLabel = "처리 중…", variant = "primary" }: { label: string; pendingLabel?: string; variant?: "primary" | "ghost" }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className={buttonClass({ variant: variant === "primary" ? "primary" : "secondary", size: "sm", className: "w-full sm:w-auto" })}
    >
      {pending ? pendingLabel : label}
    </button>
  );
}

export function ActionStatus({ state }: { state: AdminActionState }) {
  if (!state) return null;
  return (
    <p aria-live="polite" className={`text-[12.5px] ${state.ok ? "text-ok" : "text-danger"}`}>
      {state.ok ? state.message : state.error}
    </p>
  );
}
