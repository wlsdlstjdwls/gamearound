"use client";
// 상품 매핑 검수 버튼 (§5.2). 승인은 되돌릴 수 있고(게임을 다시 고르면 된다) 거절은 후보를 무르는 일이라
// 둘 다 확인 창을 띄우지 않는다 — 스무 줄을 훑는 화면에서 확인 창은 판정을 느리게만 한다.
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { approveProductMatchAction, rejectProductMatchAction, type AdminActionState } from "@/app/(admin)/admin/actions";
import { ADMIN_ACTION_MESSAGES as A } from "@/lib/admin/messages";

export function ProductMatchButtons({ productId }: { productId: string }) {
  const [pending, start] = useTransition();
  const [state, setState] = useState<AdminActionState>(null);
  return (
    // 좁은 화면에서는 이 두 버튼이 카드의 마지막 줄이다 — 반씩 나눠 가져 손가락이 골라 누를 만해진다
    <div className="flex flex-wrap items-center gap-2">
      <Button
        size="sm"
        disabled={pending}
        onClick={() => start(async () => setState(await approveProductMatchAction(productId)))}
        className="flex-1 md:flex-none"
      >
        {A.link}
      </Button>
      <Button
        size="sm"
        variant="secondary"
        disabled={pending}
        onClick={() => start(async () => setState(await rejectProductMatchAction(productId)))}
        className="flex-1 hover:border-danger hover:text-danger md:flex-none"
      >
        {A.unlink}
      </Button>
      {state && !state.ok && <span className="text-[11.5px] text-danger">{state.error}</span>}
    </div>
  );
}
