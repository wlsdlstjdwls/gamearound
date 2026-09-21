"use client";
// 매칭 판정 버튼 (§4.2). 매칭 대기 큐와 /admin/games/[id] 의 "이어진 스토어" 에서 함께 쓴다.
//
// 낱말은 상품 매핑 큐와 맞춘다(맞아요, 아니에요) — 두 큐가 같은 질문을 하므로 같은 말로 묻는다.
// 낱말을 고른 이유는 messages/actions.ts 주석에 있다.
import { useState, useTransition } from "react";
import { approveMatchAction, rejectMatchAction, type AdminActionState } from "@/app/(admin)/admin/actions";
import { ADMIN_ACTION_MESSAGES as A } from "@/lib/admin/messages";

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
        {A.link}
      </button>
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          if (!confirm(A.unlinkConfirm)) return;
          start(async () => setState(await rejectMatchAction(gameId, source)));
        }}
        className="press rounded-[7px] border border-line-strong px-[11px] py-[5px] text-[12px] text-mut transition-colors hover:border-danger hover:text-danger disabled:opacity-60"
      >
        {A.unlink}
      </button>
      {state && !state.ok && <span className="text-[11.5px] text-danger">{state.error}</span>}
    </div>
  );
}
