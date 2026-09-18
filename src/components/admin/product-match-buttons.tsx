"use client";
// 상품 매핑 검수 버튼 (§5.2). 승인은 되돌릴 수 있고(게임을 다시 고르면 된다) 거절은 후보를 무르는 일이라
// 둘 다 확인 창을 띄우지 않는다 — 스무 줄을 훑는 화면에서 확인 창은 판정을 느리게만 한다.
import { useState, useTransition } from "react";
import { approveProductMatchAction, rejectProductMatchAction, type AdminActionState } from "@/app/(admin)/admin/actions";

export function ProductMatchButtons({ productId }: { productId: string }) {
  const [pending, start] = useTransition();
  const [state, setState] = useState<AdminActionState>(null);
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        disabled={pending}
        onClick={() => start(async () => setState(await approveProductMatchAction(productId)))}
        className="press rounded-[7px] bg-ink px-[11px] py-[5px] text-[12px] font-semibold text-on-ink transition-colors hover:bg-ink-2 disabled:opacity-60"
      >
        잇기
      </button>
      <button
        type="button"
        disabled={pending}
        onClick={() => start(async () => setState(await rejectProductMatchAction(productId)))}
        className="press rounded-[7px] border border-line-strong px-[11px] py-[5px] text-[12px] text-mut transition-colors hover:border-danger hover:text-danger disabled:opacity-60"
      >
        무르기
      </button>
      {state && !state.ok && <span className="text-[11.5px] text-danger">{state.error}</span>}
    </div>
  );
}
