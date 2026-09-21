"use client";

// 할 일 카드 한 장. 옮기기, 순서 바꾸기, 고치기, 기록, 지우기가 카드 안에 있다.
//
// **드래그만 두지 않는 이유**(AGENTS §6 a11y): 드래그는 포인터 기기에만 있는 길이다.
// 그것만 두면 키보드 사용자와 터치 사용자가 순서를 못 바꾼다. 그래서 진짜 조작은 버튼과 선택 상자이고,
// 드래그는 마우스에게만 얹어 주는 지름길이다 — 드래그가 죽어도 판은 온전히 돌아간다.
//
// **기록을 접어 두는 이유**: 판은 네 칸을 한 화면에 세우는 자리다. 카드마다 기록을 펼쳐 두면
// 카드 한 장이 화면 높이를 먹어 "한눈에 본다" 는 목적이 깨진다. 몇 줄이 쌓였는지는 접힌 채로 보인다.
import { useCallback, useState, useTransition } from "react";
import Link from "next/link";
import { cn } from "@/lib/cn";
import { panelClass } from "@/components/ui/page";
import { gamePath } from "@/lib/routes";
import { TASK_MESSAGES, TASK_PRIORITY_LABEL, TASK_STATUS_LABEL } from "@/lib/admin/messages";
import { TASK_STATUSES, type AdminTask } from "@/lib/admin/tasks";
import { TaskEditForm } from "@/components/admin/task-card/edit-form";
import { TaskNotes } from "@/components/admin/task-card/notes";
import { deleteTaskAction, moveTaskAction, reorderTaskAction, type TaskActionState } from "@/app/(admin)/admin/tasks/actions";

/** 급함 표시. 보통은 아무 표시도 하지 않는다 — 전부 표시하면 어느 것도 눈에 띄지 않는다 */
const PRIORITY_STYLE: Record<AdminTask["priority"], string> = {
  high: "bg-danger-soft text-danger",
  normal: "",
  low: "bg-surface-3 text-dim",
};

const ICON_BTN = "press rounded-[6px] border border-line px-1.5 py-0.5 text-[11px] text-mut transition-colors hover:border-line-strong hover:text-ink disabled:opacity-50";

export function TaskCard({ task, onDragStart }: { task: AdminTask; onDragStart?: (id: string) => void }) {
  const [pending, start] = useTransition();
  const [state, setState] = useState<TaskActionState>(null);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);

  const run = (fn: () => Promise<TaskActionState>) => start(async () => setState(await fn()));
  const stopEditing = useCallback(() => setEditing(false), []);

  return (
    <li
      // 고치는 중에는 드래그를 끈다 — 글을 고르려고 긁는 동작이 카드를 통째로 끌고 간다
      draggable={!editing}
      onDragStart={(e) => {
        e.dataTransfer.setData("text/plain", task.id);
        e.dataTransfer.effectAllowed = "move";
        onDragStart?.(task.id);
      }}
      className={panelClass(cn("flex flex-col gap-2 p-3", pending && "opacity-60"))}
    >
      {editing ? (
        <TaskEditForm task={task} onDone={stopEditing} />
      ) : (
        <>
          <div className="flex items-start justify-between gap-2">
            <p className="min-w-0 flex-1 text-[13px] font-medium leading-[1.45] text-ink">{task.title}</p>
            {task.priority !== "normal" && (
              <span className={cn("shrink-0 rounded-[6px] px-1.5 py-0.5 text-[10.5px] font-semibold", PRIORITY_STYLE[task.priority])}>
                {TASK_PRIORITY_LABEL[task.priority]}
              </span>
            )}
          </div>

          {task.body && <p className="whitespace-pre-wrap text-[12px] leading-[1.6] text-mut">{task.body}</p>}
        </>
      )}

      {/* 붙인 대상. 이 줄이 이 판을 외부 도구와 가르는 자리다 — 할 일에서 그 행으로 바로 간다 */}
      {(task.game || task.shop || task.source) && (
        <div className="flex flex-wrap items-center gap-1.5 text-[11.5px]">
          {task.game && (
            <Link href={gamePath(task.game.slug)} className="rounded-[6px] bg-surface-3 px-1.5 py-0.5 text-acc hover:underline">
              {task.game.title}
            </Link>
          )}
          {task.shop && <span className="rounded-[6px] bg-surface-3 px-1.5 py-0.5 text-mut">{task.shop.name}</span>}
          {task.source && <span className="rounded-[6px] bg-surface-3 px-1.5 py-0.5 font-mono text-[11px] text-mut">{task.source}</span>}
        </div>
      )}

      <div className="flex items-center gap-1">
        <label className="sr-only" htmlFor={`move-${task.id}`}>
          {TASK_MESSAGES.moveTo}
        </label>
        <select
          id={`move-${task.id}`}
          value={task.status}
          disabled={pending}
          onChange={(e) => run(() => moveTaskAction(task.id, e.target.value))}
          className="rounded-[6px] border border-line bg-surface px-1.5 py-0.5 text-[11.5px] text-mut"
        >
          {TASK_STATUSES.map((s) => (
            <option key={s} value={s}>
              {TASK_STATUS_LABEL[s]}
            </option>
          ))}
        </select>

        <button type="button" className={ICON_BTN} disabled={pending} onClick={() => run(() => reorderTaskAction(task.id, "up"))}>
          {TASK_MESSAGES.up}
        </button>
        <button type="button" className={ICON_BTN} disabled={pending} onClick={() => run(() => reorderTaskAction(task.id, "down"))}>
          {TASK_MESSAGES.down}
        </button>

        <button
          type="button"
          disabled={pending}
          onClick={() => {
            if (!confirm(TASK_MESSAGES.removeConfirm)) return;
            run(() => deleteTaskAction(task.id));
          }}
          className="press ml-auto rounded-[6px] px-1.5 py-0.5 text-[11px] text-dim transition-colors hover:text-danger disabled:opacity-50"
        >
          {TASK_MESSAGES.remove}
        </button>
      </div>

      <div className="flex items-center gap-1">
        <button
          type="button"
          aria-expanded={open}
          aria-controls={`notes-${task.id}`}
          onClick={() => setOpen((v) => !v)}
          className="press rounded-[6px] px-1.5 py-0.5 text-[11px] text-mut transition-colors hover:text-ink"
        >
          {TASK_MESSAGES.notes}
          {task.notes.length > 0 && <span className="ml-1 tabular-nums text-dim">{task.notes.length}</span>}
        </button>
        {!editing && (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="press ml-auto rounded-[6px] px-1.5 py-0.5 text-[11px] text-dim transition-colors hover:text-ink"
          >
            {TASK_MESSAGES.edit}
          </button>
        )}
      </div>

      {open && (
        <div id={`notes-${task.id}`}>
          <TaskNotes taskId={task.id} notes={task.notes} />
        </div>
      )}

      {state && !state.ok && <p className="text-[11.5px] text-danger">{state.error}</p>}
    </li>
  );
}
