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
        className="press rounded-[7px] bg-ink px-[11px] py-[5px] text-[12px] font-semibold text-on-ink transition-colors hover:bg-ink-2 disabled:opacity-60"
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
        className="press rounded-[7px] border border-line-strong px-[11px] py-[5px] text-[12px] text-mut transition-colors hover:border-danger hover:text-danger disabled:opacity-60"
      >
        거절
      </button>
      {state && !state.ok && <span className="text-[11.5px] text-danger">{state.error}</span>}
    </div>
  );
}
