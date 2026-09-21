"use client";

// 할 일 하나에 쌓인 기록. 사람이 적은 글과 판이 남긴 칸 이동 자취가 한 줄기로 섞여 시각순으로 선다.
//
// **왜 카드 본문(메모)과 따로 두나:** 메모는 "이 일이 무엇인가" 라서 덮어써야 하고,
// 기록은 "어떻게 흘러왔나" 라서 쌓여야 한다. 한 칸에 넣으면 둘 중 하나가 늘 손해를 본다 —
// 덮어쓰면 지난 판단의 근거가 사라지고, 쌓으면 카드 제목 밑이 옛 이야기로 길어진다.
//
// 자취(move)는 지우지 못한다. 지울 수 있으면 이력이 "고쳐 쓸 수 있는 이야기" 가 되어 근거로 못 쓴다.
import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { cn } from "@/lib/cn";
import { formatDateTime } from "@/lib/format";
import { TASK_MESSAGES, TASK_STATUS_LABEL } from "@/lib/admin/messages";
import type { TaskNote } from "@/lib/admin/tasks";
import { addNoteAction, deleteNoteAction, type TaskActionState } from "@/app/(admin)/admin/tasks/actions";

/** 자취 한 줄의 앞뒤 칸. 화살표 대신 파이프로 잇는다(AGENTS §4) */
function MoveLine({ note }: { note: TaskNote }) {
  return (
    <span className="text-[11.5px] text-mut">
      <span className="mr-1 rounded-[5px] bg-surface-3 px-1 py-0.5 text-[10.5px] text-dim">{TASK_MESSAGES.noteMoved}</span>
      {note.from ? TASK_STATUS_LABEL[note.from] : "-"} | {note.to ? TASK_STATUS_LABEL[note.to] : "-"}
    </span>
  );
}

export function TaskNotes({ taskId, notes }: { taskId: string; notes: TaskNote[] }) {
  const [state, formAction, posting] = useActionState<TaskActionState, FormData>(addNoteAction, null);
  const [pending, start] = useTransition();
  const [removeState, setRemoveState] = useState<TaskActionState>(null);
  const boxRef = useRef<HTMLTextAreaElement>(null);

  // 남기고 나면 칸을 비운다 — 액션이 성공했을 때만. 실패하면 적은 글이 사라지면 안 된다
  useEffect(() => {
    if (state?.ok && boxRef.current) boxRef.current.value = "";
  }, [state]);

  const error = (state && !state.ok && state.error) || (removeState && !removeState.ok && removeState.error) || null;

  return (
    <div className="flex flex-col gap-2 border-t border-line pt-2">
      {notes.length === 0 ? (
        <p className="text-[11.5px] text-dim">{TASK_MESSAGES.noteEmpty}</p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {notes.map((n) => (
            <li key={n.id} className="group flex flex-col gap-0.5">
              {n.kind === "move" ? (
                <MoveLine note={n} />
              ) : (
                <p className="whitespace-pre-wrap text-[12px] leading-[1.6] text-ink">{n.body}</p>
              )}
              <div className="flex items-center gap-1.5 text-[10.5px] text-dim">
                <span className="tabular-nums">{formatDateTime(n.createdAt)}</span>
                {n.authorName && <span className="truncate">{n.authorName}</span>}
                {n.kind === "note" && (
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => {
                      if (!confirm(TASK_MESSAGES.noteRemoveConfirm)) return;
                      start(async () => setRemoveState(await deleteNoteAction(n.id)));
                    }}
                    className="press ml-auto rounded-[5px] px-1 py-0.5 text-dim transition-colors hover:text-danger disabled:opacity-50"
                  >
                    {TASK_MESSAGES.noteRemove}
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      <form action={formAction} className="flex flex-col gap-1.5">
        <input type="hidden" name="taskId" value={taskId} />
        <label className="sr-only" htmlFor={`note-${taskId}`}>
          {TASK_MESSAGES.noteLabel}
        </label>
        <textarea
          ref={boxRef}
          id={`note-${taskId}`}
          name="body"
          rows={2}
          placeholder={TASK_MESSAGES.notePlaceholder}
          // 16px 미만이면 iOS 가 화면을 확대한다(AGENTS §6)
          className="w-full resize-y rounded-[7px] border border-line bg-surface px-2 py-1.5 text-[16px] leading-[1.5] text-ink placeholder:text-dim sm:text-[12.5px]"
        />
        <button
          type="submit"
          disabled={posting}
          className={cn(
            "press self-end rounded-[7px] border border-line-strong px-2.5 py-1 text-[11.5px] text-mut transition-colors",
            "hover:border-acc hover:text-acc disabled:opacity-60",
          )}
        >
          {TASK_MESSAGES.noteAdd}
        </button>
      </form>

      {error && <p className="text-[11.5px] text-danger">{error}</p>}
    </div>
  );
}
