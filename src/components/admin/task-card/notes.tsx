"use client";

// 할 일 하나에 쌓인 기록. 사람이 적은 글과 판이 남긴 칸 이동 자취가 한 줄기로 섞여 시각순으로 선다.
//
// **왜 카드 본문(메모)과 따로 두나:** 메모는 "이 일이 무엇인가" 라서 덮어써야 하고,
// 기록은 "어떻게 흘러왔나" 라서 쌓여야 한다. 한 칸에 넣으면 둘 중 하나가 늘 손해를 본다 —
// 덮어쓰면 지난 판단의 근거가 사라지고, 쌓으면 카드 제목 밑이 옛 이야기로 길어진다.
//
// 자취(move)는 지우지 못한다. 지울 수 있으면 이력이 "고쳐 쓸 수 있는 이야기" 가 되어 근거로 못 쓴다.
//
// 적는 칸은 팝업 바닥에 붙어 있다(2026-09-22, sticky) — 기록이 길어져도 한 줄 남기는 데
// 스크롤이 들지 않아야 한다. 이 마디가 팝업의 마지막이 아니어도 상관없다: sticky 는 제 부모 안에서만 붙는다.
//
// 모양(2026-09-21): 팝업으로 옮기면서 세로 줄기를 세웠다. 사람이 적은 글과 자취가 섞여 서는 자리라
// 둘을 색이나 배경으로 가르면 목록이 얼룩덜룩해진다 — 줄기 위의 점 하나로만 가른다
// (적은 글은 브랜드 보라 점, 자취는 회색 테두리 점).
import { useActionState, useState, useTransition } from "react";
import { ActionForm } from "@/components/ui/action-form";
import { cn } from "@/lib/cn";
import { formatLongDateTime } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { TASK_MESSAGES, TASK_STATUS_LABEL, TASK_STATUS_TO_PARTICLE } from "@/lib/admin/messages";
import type { TaskNote, TaskStatus } from "@/lib/admin/tasks";
import { FIELD } from "@/components/admin/task-fields";
import { addNoteAction, deleteNoteAction, type TaskActionState } from "@/app/(admin)/admin/tasks/actions";

/** 칸 이름 앞에 칸 색 점 — 판의 칸 머리와 같은 색이라 "어디서 어디로" 가 글자 전에 갈린다 */
/**
 * 칸 이름. 칩이 아니라 글자다 — 칩으로 감싸면 복사했을 때 줄마다 끊겼다.
 * 색 점은 걷었다(사용자: "색 동그라미는 빼고 차라리 현재 상태에 강조"). 바뀐 뒤의 칸(current)만 보라 굵은 글자로 세운다 —
 * 읽는 사람이 알고 싶은 건 "그래서 지금 어디인가" 다.
 */
function StatusName({ status, current = false }: { status: TaskStatus | null; current?: boolean }) {
  if (!status) return <>-</>;
  return current ? (
    <strong className="font-bold text-acc">{TASK_STATUS_LABEL[status]}</strong>
  ) : (
    <span className="text-ink">{TASK_STATUS_LABEL[status]}</span>
  );
}

/**
 * 칸 이동 자취 한 줄. 사람이 적은 글보다 **작고 흐리게** 둔다(2026-10-01, 사용자: "기록 쪽이 눈에 안 띈다") —
 * 둘이 같은 무게로 섞여 있으면 정작 읽어야 할 사람 글이 자취 사이에 묻힌다. 화살표 대신 파이프로 잇는다(AGENTS §4).
 */
function MoveLine({ note }: { note: TaskNote }) {
  // 두 줄이다(2026-10-01, 사용자: "1줄로 바뀌면서 뭐가 뭔지 모르겠다, 어디서 어떻게 바뀐 건지 모르겠다").
  // 한 줄에 표식, 칸, 시각, 이름을 다 붙이니 "할 일 | 처리 중 15:00 시험관리자" 가 어디서 끊기는지 안 읽혔다.
  // 사람 글과 같은 머리(누가, 언제)를 세우고, 무엇이 바뀌었는지는 아래 한 줄 평문으로 둔다
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-2">
        {note.authorName && <span className="truncate text-[13.5px] font-bold text-ink">{note.authorName}</span>}
        <span className="rounded-md bg-surface-3 px-1.5 py-0.5 text-[12px] font-semibold text-mut">{TASK_MESSAGES.noteMoved}</span>
        <span className="text-[12.5px] tabular-nums text-mut">{formatLongDateTime(note.createdAt)}</span>
      </div>
      {/* 한 줄 평문이다: "할 일 → 처리 중으로 변경되었습니다"(사용자가 정한 꼴, messages 주석) */}
      <p className="text-[14px] leading-[1.6] text-mut">
        <StatusName status={note.from} /> {TASK_MESSAGES.noteMovedArrow} <StatusName status={note.to} current />
        {note.to ? TASK_STATUS_TO_PARTICLE[note.to] : ""} {TASK_MESSAGES.noteMovedTail}
      </p>
    </div>
  );
}

/**
 * `readOnly` 는 지난 일 화면 몫이다(2026-10-02) — 걷은 일은 되짚어 보는 자리라 적는 칸과 지우기 단추를 걷는다.
 * 더 적을 일이 생기면 판으로 되돌린 뒤 적는다. 걷은 채로 기록이 늘면 "끝낸 일" 이 끝나지 않은 일이 된다.
 */
export function TaskNotes({ taskId, notes, readOnly = false }: { taskId: string; notes: TaskNote[]; readOnly?: boolean }) {
  const [state, formAction, posting] = useActionState<TaskActionState, FormData>(addNoteAction, null);
  const [pending, start] = useTransition();
  const [removeState, setRemoveState] = useState<TaskActionState>(null);

  const error = (state && !state.ok && state.error) || (removeState && !removeState.ok && removeState.error) || null;

  return (
    <div className="flex flex-col gap-4">
      {notes.length === 0 ? (
        <p className="rounded-xl border border-dashed border-line-strong px-3 py-3 text-center text-[13.5px] text-dim">{TASK_MESSAGES.noteEmpty}</p>
      ) : (
        // 줄기 선과 점, 말풍선을 걷었다(2026-10-01, 사용자: "가독성이 너무 떨어진다") — 장식이 글보다 먼저 읽혔다.
        // 지금은 헤어라인으로 가른 목록이다: 사람 글은 이름(굵게), 시각이 한 줄, 본문이 그 아래 넉넉한 줄간격으로 선다.
        <ul className="flex flex-col divide-y divide-line">
          {notes.map((n) => (
            <li key={n.id} className="py-3 first:pt-0 last:pb-0">
              {n.kind === "move" ? (
                <MoveLine note={n} />
              ) : (
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center gap-2">
                    {n.authorName && <span className="truncate text-[13.5px] font-bold text-ink">{n.authorName}</span>}
                    <span className="text-[12.5px] tabular-nums text-mut">{formatLongDateTime(n.createdAt)}</span>
                    {!readOnly && (
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => {
                        if (!confirm(TASK_MESSAGES.noteRemoveConfirm)) return;
                        start(async () => setRemoveState(await deleteNoteAction(n.id)));
                      }}
                      className="press ml-auto rounded-[5px] px-1.5 py-0.5 text-[12.5px] text-mut transition-colors hover:text-danger disabled:opacity-50"
                    >
                      {TASK_MESSAGES.noteRemove}
                    </button>
                    )}
                  </div>
                  <p className="whitespace-pre-wrap text-[15px] leading-[1.7] text-ink">{n.body}</p>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {/*
       * 적는 칸은 팝업 바닥에 붙는다(2026-09-22). 기록은 쌓이는 값이라, 줄이 길어질수록
       * 한 줄 적으려고 지나야 하는 스크롤도 같이 길어졌다 — 가장 자주 하는 일이 가장 멀리 있었다.
       * sticky 라 자리를 차지하지 않고, 위로 흐르는 기록을 가리는 만큼만 바탕을 깐다.
       */}
      {/* -bottom-5: 시트 본문의 아래 여백(pb-5)까지 내려 붙인다 — bottom-0 이면 그 여백 위에 멈춰 밑으로 기록이 비쳤다(고치기 폼 저장 줄과 같은 이유) */}
      {!readOnly && (
      <ActionForm action={formAction} state={state} pending={posting} className="sticky -bottom-5 -mx-4 flex flex-col gap-2 bg-surface px-4 pb-5 pt-3">
        {/* 밑에서 올라오는 기록이 칸 밑으로 툭 잘리지 않게, 바탕이 시작되는 자리를 흐린다 */}
        <span aria-hidden className="pointer-events-none absolute inset-x-0 -top-4 h-4 bg-gradient-to-b from-transparent to-surface" />
        <input type="hidden" name="taskId" value={taskId} />
        <label className="sr-only" htmlFor={`note-${taskId}`}>
          {TASK_MESSAGES.noteLabel}
        </label>
        <div className="flex items-end gap-2">
          <textarea
            id={`note-${taskId}`}
            name="body"
            rows={2}
            placeholder={TASK_MESSAGES.notePlaceholder}
            className={cn(FIELD, "flex-1 resize-y")}
          />
          <Button type="submit" variant="primary" loading={posting} className="shrink-0">
            {TASK_MESSAGES.noteAdd}
          </Button>
        </div>
      </ActionForm>
      )}

      {error && (
        <p role="alert" className="animate-rise text-[13.5px] text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
