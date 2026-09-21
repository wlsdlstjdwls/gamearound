"use client";

// 할 일 하나에 쌓인 기록. 사람이 적은 글과 판이 남긴 칸 이동 자취가 한 줄기로 섞여 시각순으로 선다.
//
// **왜 카드 본문(메모)과 따로 두나:** 메모는 "이 일이 무엇인가" 라서 덮어써야 하고,
// 기록은 "어떻게 흘러왔나" 라서 쌓여야 한다. 한 칸에 넣으면 둘 중 하나가 늘 손해를 본다 —
// 덮어쓰면 지난 판단의 근거가 사라지고, 쌓으면 카드 제목 밑이 옛 이야기로 길어진다.
//
// 자취(move)는 지우지 못한다. 지울 수 있으면 이력이 "고쳐 쓸 수 있는 이야기" 가 되어 근거로 못 쓴다.
//
// 모양(2026-09-21): 팝업으로 옮기면서 세로 줄기를 세웠다. 사람이 적은 글과 자취가 섞여 서는 자리라
// 둘을 색이나 배경으로 가르면 목록이 얼룩덜룩해진다 — 줄기 위의 점 하나로만 가른다
// (적은 글은 브랜드 보라 점, 자취는 회색 테두리 점).
import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { cn } from "@/lib/cn";
import { formatDateTime } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { TASK_MESSAGES, TASK_STATUS_LABEL } from "@/lib/admin/messages";
import type { TaskNote } from "@/lib/admin/tasks";
import { FIELD } from "@/components/admin/task-fields";
import { addNoteAction, deleteNoteAction, type TaskActionState } from "@/app/(admin)/admin/tasks/actions";

/** 자취 한 줄의 앞뒤 칸. 화살표 대신 파이프로 잇는다(AGENTS §4) */
function MoveLine({ note }: { note: TaskNote }) {
  return (
    <p className="text-[12.5px] text-mut">
      <span className="mr-1.5 rounded-[5px] bg-surface-3 px-1.5 py-0.5 text-[10.5px] text-dim">{TASK_MESSAGES.noteMoved}</span>
      {note.from ? TASK_STATUS_LABEL[note.from] : "-"} | {note.to ? TASK_STATUS_LABEL[note.to] : "-"}
    </p>
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
    <div className="flex flex-col gap-4">
      {notes.length === 0 ? (
        <p className="text-[12.5px] text-dim">{TASK_MESSAGES.noteEmpty}</p>
      ) : (
        // 줄기는 목록 왼쪽에 1px 선으로 깔고, 점이 그 위에 앉는다
        <ul className="flex flex-col gap-3.5 border-l border-line pl-4">
          {notes.map((n) => (
            <li key={n.id} className="relative flex flex-col gap-1">
              <span
                aria-hidden
                className={cn(
                  "absolute -left-[21px] top-[5px] size-[9px] rounded-full",
                  n.kind === "note" ? "bg-acc" : "border border-line-strong bg-bg",
                )}
              />
              {n.kind === "move" ? (
                <MoveLine note={n} />
              ) : (
                <p className="whitespace-pre-wrap text-[13px] leading-[1.7] text-ink">{n.body}</p>
              )}
              <div className="flex items-center gap-2 text-[11px] text-dim">
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
                    className="press ml-auto rounded-[5px] px-1.5 py-0.5 transition-colors hover:text-danger disabled:opacity-50"
                  >
                    {TASK_MESSAGES.noteRemove}
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      <form action={formAction} className="flex flex-col gap-2">
        <input type="hidden" name="taskId" value={taskId} />
        <label className="sr-only" htmlFor={`note-${taskId}`}>
          {TASK_MESSAGES.noteLabel}
        </label>
        <textarea
          ref={boxRef}
          id={`note-${taskId}`}
          name="body"
          rows={3}
          placeholder={TASK_MESSAGES.notePlaceholder}
          className={cn(FIELD, "resize-y")}
        />
        <Button type="submit" variant="secondary" loading={posting} className="self-end">
          {TASK_MESSAGES.noteAdd}
        </Button>
      </form>

      {error && (
        <p role="alert" className="animate-rise text-[12.5px] text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
