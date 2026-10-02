"use client";

// 지난 일 — 판에서 걷은 할 일 목록(2026-10-02, 사용자: "치운 일 이력을 확인할 방법").
//
// 줄 하나가 할 일 하나다. 펼치면 메모와 기록이 그대로 선다 — 이 화면에 오는 이유가 "그때 어떻게 끝냈더라" 라서
// 기록이 주인공이다. 펼침은 <details> 로 한다: 키보드, 화면 낭독기가 따로 손대지 않아도 열리고 닫힌다(AGENTS §6).
//
// 판처럼 팝업을 띄우지 않는다. 팝업은 "고치는 자리" 인데 걷은 일은 고치지 않는다 —
// 고칠 일이 생기면 판으로 되돌린다. 걷은 채로 고칠 수 있으면 "끝낸 일" 이 몰래 바뀐다.
import Link from "next/link";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { formatLongDateTime } from "@/lib/format";
import { gamePath } from "@/lib/routes";
import { TASK_CATEGORY_LABEL, TASK_MESSAGES } from "@/lib/admin/messages";
import type { ArchivedTask } from "@/lib/admin/tasks";
import { CATEGORY_BADGE } from "@/components/admin/task-tone";
import { TaskNotes } from "@/components/admin/task-card/notes";
import { AttachmentList } from "@/components/admin/task-attachments";
import { restoreTaskAction, type TaskActionState } from "@/app/(admin)/admin/tasks/actions";

function ArchiveRow({ task }: { task: ArchivedTask }) {
  const [pending, start] = useTransition();
  const [state, setState] = useState<TaskActionState>(null);

  return (
    <li>
      <details className="group">
        <summary className="press flex cursor-pointer list-none flex-col gap-1.5 px-4 py-3.5 transition-colors hover:bg-surface-2 [&::-webkit-details-marker]:hidden">
          <span className="flex min-w-0 items-center gap-2">
            <span className={cn("shrink-0 rounded-[6px] px-1.5 py-0.5 text-[12px] font-semibold", CATEGORY_BADGE[task.category])}>
              {TASK_CATEGORY_LABEL[task.category]}
            </span>
            <span className="min-w-0 truncate text-[15px] font-semibold text-ink">{task.title}</span>
          </span>
          <span className="text-[12.5px] tabular-nums text-mut">
            {task.assignee?.name ?? TASK_MESSAGES.cardNoAssignee}
            {task.doneAt && ` | ${TASK_MESSAGES.doneAt} ${formatLongDateTime(task.doneAt)}`}
            {` | ${TASK_MESSAGES.archivedAt} ${formatLongDateTime(task.archivedAt)}`}
            {task.notes.length > 0 && ` | ${TASK_MESSAGES.noteCount(task.notes.length)}`}
          </span>
        </summary>

        <div className="flex flex-col gap-4 border-t border-line bg-surface-2/40 px-4 py-4">
          {task.body && <p className="whitespace-pre-wrap text-[14.5px] leading-[1.7] text-ink">{task.body}</p>}
          <AttachmentList items={task.attachments} />
          {task.game && (
            <Link href={gamePath(task.game.slug)} className="w-fit text-[13.5px] font-semibold text-acc hover:underline">
              {task.game.title}
            </Link>
          )}
          <TaskNotes taskId={task.id} notes={task.notes} readOnly />

          <div className="flex flex-wrap items-center gap-3 border-t border-line pt-3">
            <Button size="sm" variant="secondary" loading={pending} onClick={() => start(async () => setState(await restoreTaskAction(task.id)))}>
              {TASK_MESSAGES.restore}
            </Button>
            {state && !state.ok && (
              <span role="alert" className="text-[13px] text-danger">
                {state.error}
              </span>
            )}
          </div>
        </div>
      </details>
    </li>
  );
}

export function TaskArchiveList({ tasks }: { tasks: ArchivedTask[] }) {
  if (tasks.length === 0) {
    return <p className="rounded-xl border border-dashed border-line-strong px-4 py-8 text-center text-[14px] text-dim">{TASK_MESSAGES.archiveEmpty}</p>;
  }
  return <ul className="flex flex-col divide-y divide-line overflow-hidden rounded-2xl bg-surface shadow-1">{tasks.map((t) => <ArchiveRow key={t.id} task={t} />)}</ul>;
}
