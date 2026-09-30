"use client";

// 끝난 일 치우기 — "할 일 추가" 와 같은 줄 오른쪽 끝에 선다(2026-09-30 사용자 요청).
//
// 앞서는 판 바로 위에 혼자 한 줄을 차지했다. 그 줄은 버튼 하나를 위해 판을 한 줄 아래로 밀었고,
// 판을 다루는 버튼 둘(더하기, 치우기)이 서로 다른 줄에 떨어져 있었다.
// 판에서 떼어 낸 이유는 자리만이 아니다 — 판(TaskBoard)은 끌기 상태를 쥔 큰 컴포넌트라
// 머리 줄 버튼이 그 안에 있으면 버튼 하나 옮기려고 판 전체의 배치를 건드려야 한다.
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { TASK_MESSAGES } from "@/lib/admin/messages";
import { clearDoneAction, type TaskActionState } from "@/app/(admin)/admin/tasks/actions";

export function TaskClearDone({ doneCount }: { doneCount: number }) {
  const [pending, start] = useTransition();
  const [state, setState] = useState<TaskActionState>(null);
  if (doneCount === 0) return null;

  return (
    <div className="flex items-center gap-2">
      {state && !state.ok && <p className="text-[12px] text-danger">{state.error}</p>}
      <Button
        size="sm"
        variant="secondary"
        disabled={pending}
        onClick={() => {
          if (!confirm(TASK_MESSAGES.clearDoneConfirm)) return;
          start(async () => setState(await clearDoneAction()));
        }}
        className="hover:border-danger hover:text-danger"
      >
        {TASK_MESSAGES.clearDone}
      </Button>
    </div>
  );
}
