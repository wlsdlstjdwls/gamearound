"use client";
// 매칭 판정 버튼 (§4.2). 매칭 대기 큐와 /admin/games/[id] 의 "이어진 스토어" 에서 함께 쓴다.
//
// 낱말은 상품 매핑 큐와 맞췄다(잇기, 무르기). 앞서 "승인 / 거절" 이던 자리는 무엇이 일어나는지
// 말해 주지 않았고, 옆 화면이 같은 일을 다른 말로 불러 둘이 다른 동작처럼 보였다.
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
