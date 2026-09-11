"use client";
// 검수 큐 승인/거절 버튼 (§4.2). /admin 하단 목록과 /admin/games/[id] 소스 매핑 섹션에서 공용
import { useState, useTransition } from "react";
import { approveMatchAction, rejectMatchAction, type AdminActionState } from "@/app/(admin)/admin/actions";

export function MatchReviewButtons({ gameId, source }: { gameId: string; source: string }) {
  const [pending, start] = useTransition();
  const [state, setState] = useState<AdminActionState>(null);
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        disabled={pending}
        onClick={() => start(async () => setState(await approveMatchAction(gameId, source)))}
        className="rounded-md bg-emerald-500/90 px-2.5 py-1 text-xs font-medium text-slate-950 hover:bg-emerald-400 disabled:opacity-60"
      >
        승인
      </button>
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          if (!confirm("이 후보 매핑을 거절(삭제)할까요?")) return;
          start(async () => setState(await rejectMatchAction(gameId, source)));
        }}
        className="rounded-md border border-slate-700 px-2.5 py-1 text-xs text-slate-300 hover:border-red-400 hover:text-red-300 disabled:opacity-60"
      >
        거절
      </button>
      {state && !state.ok && <span className="text-xs text-red-400">{state.error}</span>}
    </div>
  );
}
