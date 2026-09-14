"use client";
// 검수 큐의 이름 한 줄을 위키데이터에서 다시 조회하는 버튼.
// 결과를 그 줄 옆에 그대로 붙여 보여 준다 — 실패 사유("후보가 없다", "둘 이상이다")가
// 이 화면의 알맹이라 토스트로 흘려보내면 안 된다.
import { useState, useTransition } from "react";
import { resolveCompanyAction, type AdminActionState } from "@/app/(admin)/admin/actions";

export function CompanyResolveButton({ name }: { name: string }) {
  const [pending, start] = useTransition();
  const [state, setState] = useState<AdminActionState>(null);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        disabled={pending}
        onClick={() => start(async () => setState(await resolveCompanyAction(name)))}
        className="press rounded-[7px] border border-line-strong px-[11px] py-[5px] text-[12px] text-mut transition-colors hover:border-acc hover:text-acc disabled:opacity-60"
      >
        {pending ? "조회 중" : "위키데이터 조회"}
      </button>
      {state && (
        <span className={`text-[11.5px] ${state.ok ? "text-acc" : "text-dim"}`}>
          {state.ok ? state.message : state.error}
        </span>
      )}
    </div>
  );
}
