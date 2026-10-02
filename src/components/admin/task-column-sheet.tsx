"use client";

// 칸 하나를 목록으로 모아 보는 시트(2026-10-02, 사용자: "각 영역에 모아보기 버튼, 바텀시트로 목록식으로 보고 작업").
//
// 왜 따로 두나: 판의 카드는 높이가 하나(112px)라 휴대폰에서는 한 화면에 카드 너덧 장이 한계다.
// 칸을 훑어 "무엇이 남았나" 를 보려면 줄 하나에 한 일이 서는 목록이 낫다. 쓰는 일은 여기서 새로 만들지 않고
// 줄을 누르면 판과 같은 팝업(TaskDialog)을 연다 — 고치기, 칸 옮기기, 기록이 두 벌이 되면 둘이 어긋난다.
//
// 팝업은 이 시트 **위에** 겹쳐 열린다. 둘 다 <dialog> 라 브라우저가 위아래를 지키고, 스크롤 잠금은
// 연 순서의 반대로 풀린다(ui/sheet 의 잠금이 직전 값을 되돌린다). 팝업을 닫으면 목록이 그대로 남아 다음 줄로 간다.
import { cn } from "@/lib/cn";
import { formatAgo } from "@/lib/format";
import { Sheet } from "@/components/ui/sheet";
import { TASK_CATEGORY_LABEL, TASK_MESSAGES, TASK_PRIORITY_LABEL, TASK_STATUS_LABEL } from "@/lib/admin/messages";
import type { AdminTask, TaskStatus } from "@/lib/admin/tasks";
import { CATEGORY_BADGE, PRIORITY_BADGE, cardStripe } from "@/components/admin/task-tone";
import { TaskQuickAdd } from "@/components/admin/task-quick-add";

export function TaskColumnSheet({
  status,
  tasks,
  now,
  meId,
  unreadOf,
  category,
  open,
  onOpenChange,
  onOpenTask,
}: {
  status: TaskStatus;
  /** 판이 거른 그대로 받는다 — 판에서 걸러 둔 조건이 시트에서 풀리면 같은 칸이 두 가지 수를 말한다 */
  tasks: AdminTask[];
  now: number;
  meId: string;
  unreadOf: (task: AdminTask) => number;
  category?: AdminTask["category"];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOpenTask: (id: string) => void;
}) {
  return (
    <Sheet title={TASK_MESSAGES.columnSheetTitle(TASK_STATUS_LABEL[status], tasks.length)} open={open} onOpenChange={onOpenChange}>
      <div className="flex flex-col gap-3">
        {tasks.length === 0 ? (
          <p className="py-6 text-center text-[13.5px] text-dim">{TASK_MESSAGES.empty}</p>
        ) : (
          <ul className="flex flex-col divide-y divide-line-soft">
            {tasks.map((task) => (
              <li key={task.id}>
                <Row task={task} now={now} mine={task.assignee?.id === meId} unread={unreadOf(task)} onOpen={onOpenTask} />
              </li>
            ))}
          </ul>
        )}
        {/* 목록에서도 바로 적는다 — 칸을 모아 보다가 빠진 일이 떠오르는 일이 잦다 */}
        <TaskQuickAdd status={status} category={category} />
      </div>
    </Sheet>
  );
}

/** 목록 한 줄 — 제목, 표, 담당, 고친 때. 메모와 기록은 팝업에 있다(한 줄에 다 넣으면 목록이 다시 카드가 된다) */
function Row({ task, now, mine, unread, onOpen }: { task: AdminTask; now: number; mine: boolean; unread: number; onOpen: (id: string) => void }) {
  const stripe = cardStripe(task);
  return (
    <button
      type="button"
      onClick={() => onOpen(task.id)}
      className="press tap relative flex w-full flex-col gap-1 py-3 pl-3 pr-1 text-left hover:bg-surface-4"
    >
      {stripe && <span aria-hidden className={cn("absolute inset-y-2 left-0 w-[3px] rounded-full", stripe)} />}
      <span className="flex min-w-0 items-center gap-1.5">
        <span className="min-w-0 flex-1 truncate text-[15px] font-semibold text-ink">{task.title}</span>
        {unread > 0 && <span className="shrink-0 rounded-full bg-danger px-2 py-0.5 text-[12px] font-bold text-on-ink">{TASK_MESSAGES.cardUnread(unread)}</span>}
      </span>
      <span className="flex min-w-0 items-center gap-1.5 text-[12.5px] text-dim">
        {task.category !== "task" && (
          <span className={cn("shrink-0 rounded-[6px] px-1.5 py-px font-semibold", CATEGORY_BADGE[task.category])}>{TASK_CATEGORY_LABEL[task.category]}</span>
        )}
        {task.priority !== "normal" && (
          <span className={cn("shrink-0 rounded-[6px] px-1.5 py-px font-semibold", PRIORITY_BADGE[task.priority])}>{TASK_PRIORITY_LABEL[task.priority]}</span>
        )}
        <span className={cn("min-w-0 truncate", mine && "font-semibold text-acc")}>{task.assignee?.name ?? TASK_MESSAGES.cardNoAssignee}</span>
        <span className="ml-auto shrink-0 tabular-nums">{formatAgo(task.updatedAt, now)}</span>
      </span>
    </button>
  );
}
