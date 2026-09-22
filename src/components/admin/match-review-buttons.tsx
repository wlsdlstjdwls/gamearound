"use client";
// 매칭 판정 버튼 (§4.2). 매칭 대기 큐와 /admin/games/[id] 의 "이어진 스토어" 에서 함께 쓴다.
//
// 낱말은 상품 매핑 큐와 맞춘다(맞아요, 아니에요) — 두 큐가 같은 질문을 하므로 같은 말로 묻는다.
// 낱말을 고른 이유는 messages/actions.ts 주석에 있다.
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { approveMatchAction, rejectMatchAction, type AdminActionState } from "@/app/(admin)/admin/actions";
import { ADMIN_ACTION_MESSAGES as A } from "@/lib/admin/messages";

export function MatchReviewButtons({ gameId, source }: { gameId: string; source: string }) {
  const [pending, start] = useTransition();
  const [state, setState] = useState<AdminActionState>(null);
  return (
    // 좁은 화면에서는 이 두 버튼이 카드의 마지막 줄이다 — 반씩 나눠 가져 손가락이 골라 누를 만해진다
    <div className="flex flex-wrap items-center gap-2">
      <Button
        size="sm"
        disabled={pending}
        onClick={() => start(async () => setState(await approveMatchAction(gameId, source)))}
        className="flex-1 md:flex-none"
      >
        {A.link}
      </Button>
      <Button
        size="sm"
        variant="secondary"
        disabled={pending}
        onClick={() => {
          if (!confirm(A.unlinkConfirm)) return;
          start(async () => setState(await rejectMatchAction(gameId, source)));
        }}
        className="flex-1 hover:border-danger hover:text-danger md:flex-none"
      >
        {A.unlink}
      </Button>
      {state && !state.ok && <span className="text-[11.5px] text-danger">{state.error}</span>}
    </div>
  );
}
