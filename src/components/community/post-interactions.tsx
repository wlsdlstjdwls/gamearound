"use client";
// 글 상세의 손이 닿는 자리(기획서 v2.0 S-15, 6.1): 좋아요(토글), 저장(내 활동의 저장한 글), 댓글, 스포 가림.
// 좋아요, 저장, 댓글은 로그인이 필요하다 — 비로그인이면 로그인 팝업 뒤 이어서 실행된다(auth/login-gate).
// 댓글은 쓰던 글까지 이어 간다: 로그인은 페이지를 통째로 다시 여니까 보내기 전에 글을 탭 저장소에 맡기고(lib/auth/resume 의 rememberDraft),
// 다시 열린 화면이 꺼내 칸에 되돌린 뒤 그대로 등록한다(기획서 6.2 "누르던 동작을 그대로 이어서 실행").
// 누른 순간 바뀐다(AGENTS §6). 실패하면 되돌리고 토스트로 이유를 말한다.
import { useOptimistic, useRef, useState, useTransition } from "react";
import { addCommentAction, toggleLikeAction, toggleSaveAction } from "@/app/(public)/board/actions";
import { useLoginGate, useResume } from "@/components/auth/login-gate";
import { forgetDraft, rememberDraft, takeDraft } from "@/lib/auth/resume";
import { Button } from "@/components/ui/button";
import { HeartIcon } from "@/components/ui/icons";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/cn";
import { COMMENT_BODY_MAX } from "@/lib/community/constants";
import { COMMUNITY_MESSAGES as M } from "@/lib/community/messages";
import { formatDateTime } from "@/lib/format";
import type { CommentDto } from "@/server/services/community";

export function PostReactions({ postId, liked: initLiked, likeCount: initCount, saved: initSaved }: { postId: string; liked: boolean; likeCount: number; saved: boolean }) {
  const gate = useLoginGate();
  const toast = useToast();
  const [like, setLike] = useState({ on: initLiked, n: initCount });
  const [saved, setSaved] = useState(initSaved);
  const [shownLike, setShownLike] = useOptimistic(like);
  const [shownSaved, setShownSaved] = useOptimistic(saved);
  const [, start] = useTransition();

  const doLike = () =>
    start(async () => {
      setShownLike({ on: !like.on, n: like.n + (like.on ? -1 : 1) });
      const r = await toggleLikeAction(postId);
      if (!r.ok) return toast(r.error);
      setLike({ on: r.liked, n: r.likeCount });
    });
  const doSave = () =>
    start(async () => {
      setShownSaved(!saved);
      const r = await toggleSaveAction(postId);
      if (!r.ok) return toast(r.error);
      setSaved(r.saved);
      toast(r.saved ? M.saved : M.unsaved);
    });
  // 이어하기는 "켜기" 로만 돈다 — 이미 켜져 있던 것을 끄지 않게
  useResume(`like:${postId}`, () => !like.on && doLike());
  useResume(`save:${postId}`, () => !saved && doSave());

  const pill = (on: boolean) => cn("press tap inline-flex h-11 items-center gap-2 rounded-full px-5 text-[14px] font-semibold shadow-hair transition-colors", on ? "bg-acc-soft text-acc" : "bg-surface-2 text-ink-2 hover:text-ink");
  return (
    <div className="flex items-center justify-center gap-2">
      <button type="button" aria-pressed={shownLike.on} onClick={() => gate(`like:${postId}`, doLike)} className={pill(shownLike.on)}>
        <HeartIcon size={17} className={shownLike.on ? "fill-current" : undefined} />
        {M.like} <span className="tabular-nums">{shownLike.n.toLocaleString("ko-KR")}</span>
      </button>
      <button type="button" aria-pressed={shownSaved} onClick={() => gate(`save:${postId}`, doSave)} className={pill(shownSaved)}>
        {shownSaved ? M.savedLabel : M.save}
      </button>
    </div>
  );
}

/** 스포 있는 리뷰는 본문을 흐리게 가리고 "스포 보기" 로 연다(2026-10-26 사용자 결정). 글쓴이는 바로 본다 */
export function SpoilerGate({ isMine, children }: { isMine: boolean; children: React.ReactNode }) {
  const [shown, setShown] = useState(isMine);
  if (shown) return <>{children}</>;
  return (
    // 짧은 본문에서도 안내 판이 넘치지 않게 최소 높이를 둔다
    <div className="relative min-h-[200px]">
      {/* 가린 본문은 낭독기에도 숨긴다 — 흐리게만 하면 화면 낭독기가 스포를 그대로 읽는다 */}
      <div aria-hidden className="pointer-events-none select-none blur-md">
        {children}
      </div>
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-xl bg-[var(--overlay)] px-6 text-center">
        <p className="text-[15px] font-bold text-ink">{M.spoilerWarnTitle}</p>
        <p className="text-[13px] text-mut">{M.spoilerWarnLead}</p>
        <Button size="md" className="mt-1" onClick={() => setShown(true)}>
          {M.spoilerReveal}
        </Button>
      </div>
    </div>
  );
}

export function Comments({ postId, initial }: { postId: string; initial: CommentDto[] }) {
  const gate = useLoginGate();
  const [list, setList] = useState(initial);
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const ref = useRef<HTMLTextAreaElement>(null);

  const action = `comment:${postId}`;

  const submit = (text: string) =>
    start(async () => {
      // 여기까지 왔으면 로그인한 채 보내는 중이다 — 맡겨 둔 글은 쓸 일이 없다
      forgetDraft(action);
      setError(null);
      // 망이 끊겨 액션 자체가 던지면 화면 전체 오류로 번지지 않게 칸 아래 오류로 접는다 — 쓴 글은 칸에 그대로 남는다
      const r = await addCommentAction({ postId, body: text }).catch(() => ({ ok: false as const, error: M.failed }));
      if (!r.ok) {
        setError(r.error);
        return;
      }
      setList((cur) => [...cur, r.comment]);
      setBody("");
    });
  // 로그인 뒤 돌아오면 맡겨 둔 글을 칸에 되돌리고 바로 등록한다. 글이 없으면(저장소가 막힌 브라우저) 칸에 포커스만 준다
  useResume(action, () => {
    const draft = takeDraft(action);
    ref.current?.scrollIntoView({ block: "center" });
    if (draft && draft.trim()) {
      setBody(draft);
      submit(draft);
    } else ref.current?.focus();
  });

  return (
    <section aria-labelledby="comments-heading" className="flex flex-col gap-4">
      <h2 id="comments-heading" className="text-[16px] font-bold text-ink">
        {M.comments} <span className="text-acc">{list.length}</span>
      </h2>
      {list.length === 0 ? (
        <p className="rounded-xl bg-surface-2 px-4 py-4 text-[13.5px] text-dim">{M.commentEmpty}</p>
      ) : (
        <ul className="flex flex-col divide-y divide-line-soft">
          {list.map((c) => (
            <li key={c.id} className="flex flex-col gap-1 py-3">
              <p className="flex items-center gap-2 text-[12.5px] text-dim">
                <span className={cn("font-semibold", c.isMine ? "text-acc" : "text-ink-2")}>{c.authorName}</span>
                <span>{formatDateTime(c.createdAt)}</span>
              </p>
              <p className="whitespace-pre-wrap text-[14.5px] leading-[1.7] text-ink">{c.body}</p>
            </li>
          ))}
        </ul>
      )}
      <form
        className="flex flex-col gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (!body.trim()) return setError(M.commentRequired);
          // 로그인 팝업으로 가면 페이지가 다시 열린다 — 그 전에 글을 맡긴다(로그인한 채면 submit 이 바로 지운다)
          rememberDraft(action, body);
          gate(action, () => submit(body));
        }}
      >
        <label htmlFor="comment-body" className="sr-only">
          {M.commentPlaceholder}
        </label>
        <textarea
          id="comment-body"
          ref={ref}
          value={body}
          maxLength={COMMENT_BODY_MAX}
          onChange={(e) => setBody(e.target.value)}
          placeholder={M.commentPlaceholder}
          rows={3}
          aria-describedby={error ? "comment-error" : undefined}
          className="resize-y rounded-xl border border-line-strong bg-bg px-4 py-3 text-[16px] leading-[1.6] text-ink outline-none focus:border-acc"
        />
        {error && (
          <p id="comment-error" role="alert" className="text-[12.5px] text-danger">
            {error}
          </p>
        )}
        <div className="flex justify-end">
          <Button type="submit" loading={pending}>
            {M.commentSubmit}
          </Button>
        </div>
      </form>
    </section>
  );
}
