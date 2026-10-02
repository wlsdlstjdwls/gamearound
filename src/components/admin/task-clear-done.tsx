"use client";

// 끝난 일 치우기 + 지난 일로 가는 길 — "할 일 추가" 와 같은 줄 오른쪽 끝에 선다(2026-09-30 사용자 요청).
//
// 앞서는 판 바로 위에 혼자 한 줄을 차지했다. 그 줄은 버튼 하나를 위해 판을 한 줄 아래로 밀었고,
// 판을 다루는 버튼 둘(더하기, 치우기)이 서로 다른 줄에 떨어져 있었다.
// 판에서 떼어 낸 이유는 자리만이 아니다 — 판(TaskBoard)은 끌기 상태를 쥔 큰 컴포넌트라
// 머리 줄 버튼이 그 안에 있으면 버튼 하나 옮기려고 판 전체의 배치를 건드려야 한다.
//
// 치우기는 걷기다(2026-10-02). 지우지 않으므로 "되돌릴 수 없어요" 확인을 걷었다 — 되돌릴 수 있는 일에
// 확인창을 띄우면 정작 되돌릴 수 없는 일(카드 지우기)의 확인창까지 버릇처럼 넘기게 된다.
import Link from "next/link";
import { useState, useTransition } from "react";
import { Button, buttonClass } from "@/components/ui/button";
import { ClockIcon } from "@/components/ui/icons";
import { TASK_MESSAGES } from "@/lib/admin/messages";
import { ROUTES } from "@/lib/routes";
import { archiveDoneAction, type TaskActionState } from "@/app/(admin)/admin/tasks/actions";

export function TaskClearDone({ doneCount }: { doneCount: number }) {
  const [pending, start] = useTransition();
  const [state, setState] = useState<TaskActionState>(null);

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      {state && (
        <p role="status" className={state.ok ? "animate-rise text-[13px] text-ok" : "text-[13px] text-danger"}>
          {state.ok ? state.message : state.error}
        </p>
      )}
      {/* 테두리 단추 + 시계 그림이다(2026-10-02, 사용자: "지난 일 버튼이 눈에 안 띈다") — ghost 는 글자 한 조각으로 읽혔다 */}
      <Link href={ROUTES.adminTasksArchive} className={buttonClass({ variant: "secondary", size: "sm" })}>
        <ClockIcon size={15} />
        {TASK_MESSAGES.archiveLink}
      </Link>
      {doneCount > 0 && (
        <Button size="sm" variant="secondary" disabled={pending} onClick={() => start(async () => setState(await archiveDoneAction()))}>
          {TASK_MESSAGES.clearDone}
        </Button>
      )}
    </div>
  );
}
