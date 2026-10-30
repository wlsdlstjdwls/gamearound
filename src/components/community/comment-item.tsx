"use client";
// 댓글 한 줄의 머리와 본문, 그리고 내 댓글의 수정, 삭제(2026-10-30 사용자 "수정/삭제 기능 다 제공하나").
// 게시판 댓글과 인디 댓글이 같이 쓴다 — 고치기, 지우기 액션만 부르는 쪽(post-interactions 의 Comments)이 갈래에 맞게 넘긴다.
// 누른 순간 화면이 먼저 바뀐다(AGENTS 6장): 고친 글은 바로 적히고, 지운 줄은 바로 빠진다. 서버가 거절하면 되돌리고 토스트로 이유를 말한다.
// 지우기는 되돌릴 수 없어 공용 확인 팝업(askConfirm)으로 한 번 묻는다. post-interactions 가 300줄을 넘어 이 줄 부품을 따로 뺐다.
import { useState, useTransition } from "react";
import type { CommentDeleteResult, CommentEditResult } from "@/app/(public)/board/actions";
import { Button } from "@/components/ui/button";
import { askConfirm } from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/cn";
import { COMMENT_BODY_MAX } from "@/lib/community/constants";
import { COMMUNITY_MESSAGES as M, POST_EDIT_MESSAGES as E } from "@/lib/community/messages";
import { formatDateTime } from "@/lib/format";
import type { CommentDto } from "@/server/services/community";

/** 댓글 입력 칸 모양 — 새 댓글 칸(post-interactions 의 CommentComposer)과 고치기 칸이 같이 쓴다 */
export const COMMENT_FIELD = "resize-y rounded-xl border border-line-strong bg-bg px-4 py-3 text-[16px] leading-[1.6] text-ink outline-none focus:border-acc";

export type CommentMineActions = { edit: (id: string, body: string) => Promise<CommentEditResult>; remove: (id: string) => Promise<CommentDeleteResult> };

/** 목록이 받는 바뀜 알림. remove 는 되돌리기 함수를 돌려준다(실패하면 부른다) */
export type CommentListOps = { edited: (id: string, body: string) => void; removed: (id: string) => () => void };

const TOOL = "tap rounded-md px-1 text-[12px] font-semibold text-dim transition-colors disabled:opacity-60";

export function CommentBody({ c, reply = false, mine, ops }: { c: CommentDto; reply?: boolean; mine?: CommentMineActions; ops?: CommentListOps }) {
  const toast = useToast();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(c.body);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const fieldId = `comment-edit-${c.id}`;
  const canManage = c.isMine && mine && ops;

  const save = () => {
    if (!canManage) return;
    const next = draft.trim();
    if (!next) return setError(M.commentRequired);
    const before = c.body;
    setError(null);
    setEditing(false);
    ops.edited(c.id, next);
    start(async () => {
      const r = await mine.edit(c.id, next).catch(() => ({ ok: false as const, error: M.failed }));
      if (r.ok) return toast(E.commentSaved);
      ops.edited(c.id, before);
      toast(r.error);
    });
  };

  const remove = async () => {
    if (!canManage) return;
    const ok = await askConfirm(E.commentDeleteBody, { title: E.commentDeleteTitle, confirmLabel: E.deleteYes, tone: "danger" });
    if (!ok) return;
    const restore = ops.removed(c.id);
    start(async () => {
      const r = await mine.remove(c.id).catch(() => ({ ok: false as const, error: M.failed }));
      if (r.ok) return toast(E.commentDeleted);
      restore();
      toast(r.error);
    });
  };

  return (
    <>
      <p className="flex items-center gap-2 text-[12.5px] text-dim">
        <span className={cn("font-semibold", c.isMine ? "text-acc" : "text-ink-2")}>{c.authorName}</span>
        <span>{formatDateTime(c.createdAt)}</span>
        {/* 글쓴이가 처음 보는 댓글에만, 이번 한 번(services/community/inbox 가 연 순간 "봤다" 로 적는다) */}
        {c.isNew && <span className="rounded-full bg-acc-soft px-1.5 py-px text-[11px] font-bold text-acc">{M.newComment}</span>}
        {canManage && !editing && (
          <span className="ml-auto flex items-center gap-1">
            <button
              type="button"
              onClick={() => {
                setDraft(c.body);
                setEditing(true);
              }}
              disabled={pending}
              className={cn(TOOL, "hover:text-ink")}
            >
              {E.commentEdit}
            </button>
            <button type="button" onClick={remove} disabled={pending} className={cn(TOOL, "hover:text-danger")}>
              {E.commentDelete}
            </button>
          </span>
        )}
      </p>
      {editing ? (
        <form
          className="flex flex-col gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            save();
          }}
        >
          <label htmlFor={fieldId} className="sr-only">
            {E.commentEdit}
          </label>
          <textarea
            id={fieldId}
            value={draft}
            autoFocus
            maxLength={COMMENT_BODY_MAX}
            rows={2}
            onChange={(e) => setDraft(e.target.value)}
            aria-describedby={error ? `${fieldId}-error` : undefined}
            className={COMMENT_FIELD}
          />
          {error && (
            <p id={`${fieldId}-error`} role="alert" className="text-[12.5px] text-danger">
              {error}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setEditing(false)}>
              {E.commentCancel}
            </Button>
            <Button type="submit">{E.commentSave}</Button>
          </div>
        </form>
      ) : (
        <p className={cn("whitespace-pre-wrap break-words leading-[1.7] text-ink", reply ? "text-[14px]" : "text-[14.5px]")}>{c.body}</p>
      )}
    </>
  );
}
