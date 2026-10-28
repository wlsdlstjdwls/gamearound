"use client";
// 글 상세의 손이 닿는 자리(기획서 v2.0 S-15, 6.1): 좋아요(토글), 저장(내 활동의 저장한 글), 댓글, 스포 가림.
// 좋아요, 저장, 댓글은 로그인이 필요하다 — 비로그인이면 로그인 팝업 뒤 이어서 실행된다(auth/login-gate).
// 댓글은 쓰던 글까지 이어 간다: 로그인은 페이지를 통째로 다시 여니까 보내기 전에 글을 탭 저장소에 맡기고(lib/auth/resume 의 rememberDraft),
// 다시 열린 화면이 꺼내 칸에 되돌린 뒤 그대로 등록한다(기획서 6.2 "누르던 동작을 그대로 이어서 실행").
// 누른 순간 바뀐다(AGENTS §6). 실패하면 되돌리고 토스트로 이유를 말한다.
import { useEffect, useOptimistic, useRef, useState, useTransition } from "react";
import { addCommentAction, toggleLikeAction, toggleSaveAction } from "@/app/(public)/board/actions";
import { useLoginGate, useResume } from "@/components/auth/login-gate";
import { forgetDraft, rememberDraft, takeDraft } from "@/lib/auth/resume";
import { Button } from "@/components/ui/button";
import { HeartIcon } from "@/components/ui/icons";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/cn";
import { COMMENT_BODY_MAX, commentAnchor } from "@/lib/community/constants";
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
        {/* 켜는 순간 하트가 튀고(찜 하트와 같은 pop), 수는 아래에서 올라와 앉는다 — 값이 바뀔 때마다 key 로 다시 붙인다 */}
        <HeartIcon size={17} className={shownLike.on ? "animate-pop fill-current" : undefined} />
        {M.like}{" "}
        <span key={shownLike.n} className="count-tick tabular-nums">
          {shownLike.n.toLocaleString("ko-KR")}
        </span>
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

/** 댓글을 받는 액션. 게시판 글이 기본이고, 인디 글은 자기 액션을 넘긴다(받는 표만 다르고 입력, 결과 모양은 같다) */
type AddCommentAction = typeof addCommentAction;

const COMMENT_FIELD = "resize-y rounded-xl border border-line-strong bg-bg px-4 py-3 text-[16px] leading-[1.6] text-ink outline-none focus:border-acc";

/**
 * 댓글 칸 하나(글에 바로 다는 칸, 답글 칸이 같이 쓴다). 쓰던 글은 로그인을 다녀와도 이어 간다:
 * 로그인은 페이지를 통째로 다시 여니까 보내기 전에 글을 탭 저장소에 맡기고(lib/auth/resume 의 rememberDraft),
 * 다시 열린 화면이 꺼내 칸에 되돌린 뒤 그대로 등록한다.
 */
function CommentComposer({
  action,
  label,
  placeholder,
  submitLabel,
  send,
  onCancel,
  autoFocus = false,
  rows = 3,
  startDraft = null,
}: {
  action: string;
  label: string;
  placeholder: string;
  submitLabel: string;
  /** 보내고 실패하면 칸 아래 띄울 문장, 성공하면 null */
  send: (text: string) => Promise<string | null>;
  onCancel?: () => void;
  autoFocus?: boolean;
  rows?: number;
  /** 로그인 뒤 이어쓰기로 열린 답글 칸 — 맡겨 둔 글을 받아 열리자마자 등록한다(Thread 주석) */
  startDraft?: string | null;
}) {
  const gate = useLoginGate();
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const ref = useRef<HTMLTextAreaElement>(null);
  const id = `comment-${action.replace(/[^a-z0-9-]/gi, "-")}`;

  const submit = (text: string) =>
    start(async () => {
      // 여기까지 왔으면 로그인한 채 보내는 중이다 — 맡겨 둔 글은 쓸 일이 없다
      forgetDraft(action);
      setError(null);
      const err = await send(text);
      if (err) return setError(err);
      setBody("");
    });
  const started = useRef(false);
  useEffect(() => {
    if (started.current || !startDraft?.trim()) return;
    started.current = true;
    setBody(startDraft);
    submit(startDraft);
    // 열린 첫 순간 한 번만 — submit 은 매 렌더 새로 만들어지지만 다시 돌 까닭이 없다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startDraft]);
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
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <textarea
        id={id}
        ref={ref}
        value={body}
        autoFocus={autoFocus}
        maxLength={COMMENT_BODY_MAX}
        onChange={(e) => setBody(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        aria-describedby={error ? `${id}-error` : undefined}
        className={COMMENT_FIELD}
      />
      {error && (
        <p id={`${id}-error`} role="alert" className="text-[12.5px] text-danger">
          {error}
        </p>
      )}
      <div className="flex justify-end gap-2">
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel} disabled={pending}>
            {M.replyCancel}
          </Button>
        )}
        <Button type="submit" loading={pending}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}

/**
 * 댓글 한 줄. 댓글함(/lounge/comments)에서 #comment-<id> 로 들어오면 그 줄까지 내려온다 — 머리띠(--header-h)에 가리지 않게
 * 그만큼 여백을 두고(scroll-margin), 도착한 줄은 잠깐 빛을 깔아 "여기" 를 알린다(globals.css 의 .comment-target)
 */
const COMMENT_ITEM_CLASS = "comment-target flex scroll-mt-[calc(var(--header-h)+24px)] flex-col gap-1 py-3.5";

function CommentBody({ c, reply = false }: { c: CommentDto; reply?: boolean }) {
  return (
    <>
      <p className="flex items-center gap-2 text-[12.5px] text-dim">
        <span className={cn("font-semibold", c.isMine ? "text-acc" : "text-ink-2")}>{c.authorName}</span>
        <span>{formatDateTime(c.createdAt)}</span>
        {/* 글쓴이가 처음 보는 댓글에만, 이번 한 번(services/community/inbox 가 연 순간 "봤다" 로 적는다) */}
        {c.isNew && <span className="rounded-full bg-acc-soft px-1.5 py-px text-[11px] font-bold text-acc">{M.newComment}</span>}
      </p>
      <p className={cn("whitespace-pre-wrap break-words leading-[1.7] text-ink", reply ? "text-[14px]" : "text-[14.5px]")}>{c.body}</p>
    </>
  );
}

/**
 * 원댓글 하나와 그 답글들. 답글은 왼쪽 선 하나로 묶어 들여 세운다(한 단계뿐이라 선 하나면 "누구에게 한 말" 이 읽힌다).
 * 답글 칸은 "답글" 을 눌렀을 때만 연다. 로그인 뒤 이어쓰기는 닫힌 칸으로 돌아오므로, 이어하기를 이 줄이 받아 칸을 열고
 * 맡겨 둔 글을 칸에 넘긴다(CommentComposer 의 startDraft).
 */
function Thread({ root, replies, postId, onAdded, addAction, canReply }: { root: CommentDto; replies: CommentDto[]; postId: string; onAdded: (c: CommentDto) => void; addAction: AddCommentAction; canReply: boolean }) {
  const action = `reply:${postId}:${root.id}`;
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<string | null>(null);
  useResume(action, () => {
    setDraft(takeDraft(action));
    setOpen(true);
  });
  const send = async (text: string) => {
    const r = await addAction({ postId, body: text, parentId: root.id }).catch(() => ({ ok: false as const, error: M.failed }));
    if (!r.ok) return r.error;
    onAdded(r.comment);
    setOpen(false);
    return null;
  };
  return (
    <li id={commentAnchor(root.id)} className={COMMENT_ITEM_CLASS}>
      <CommentBody c={root} />
      {canReply && (
        <button type="button" aria-expanded={open} onClick={() => setOpen((v) => !v)} className="tap -ml-1 w-fit rounded-md px-1 text-[12.5px] font-semibold text-mut hover:text-acc">
          {M.reply}
          {replies.length > 0 && <span className="ml-1 tabular-nums text-dim">{replies.length}</span>}
        </button>
      )}
      {(replies.length > 0 || open) && (
        <div className="mt-1.5 flex flex-col gap-3 border-l-2 border-line pl-4 sm:ml-1">
          {replies.length > 0 && (
            <ul className="flex flex-col gap-3" aria-label={M.replyTo(root.authorName)}>
              {replies.map((r) => (
                <li key={r.id} id={commentAnchor(r.id)} className={cn(COMMENT_ITEM_CLASS, "py-0")}>
                  <CommentBody c={r} reply />
                </li>
              ))}
            </ul>
          )}
          {open && (
            <CommentComposer
              action={action}
              label={M.replyPlaceholder(root.authorName)}
              placeholder={M.replyPlaceholder(root.authorName)}
              submitLabel={M.replySubmit}
              send={send}
              onCancel={() => setOpen(false)}
              autoFocus
              rows={2}
              startDraft={draft}
            />
          )}
        </div>
      )}
    </li>
  );
}

/**
 * 댓글함에서 #comment-<id> 로 들어온 줄을 찾아 그 자리로 내리고 표시를 단다. :target 을 쓰지 않는 이유: 사이트 안 이동(router push)은
 * 주소의 # 를 바꿔도 :target 이 갱신되지 않아, 새로 고침했을 때만 빛이 섰다. 스크롤도 여기서 한 번 더 한다 — 본문이 스트리밍으로
 * 늦게 오면 라우터의 해시 스크롤이 댓글이 서기 전에 끝난다
 */
function useArrivedComment() {
  useEffect(() => {
    const id = decodeURIComponent(window.location.hash.slice(1));
    if (!id.startsWith(commentAnchor(""))) return;
    const el = document.getElementById(id);
    if (!el) return;
    el.scrollIntoView({ block: "start" });
    el.setAttribute(ARRIVED_ATTR, "");
  }, []);
}

/** 도착한 댓글 줄 표식. globals.css 의 .comment-target[data-arrived] 가 잠깐 빛을 깐다 */
const ARRIVED_ATTR = "data-arrived";

/** replies: 답글을 받는 글인가. 게시판, 라운지 글만 켠다 — 인디 글 댓글 표에는 답글 칸이 없다(schema-indie-promo) */
export function Comments({ postId, initial, addAction = addCommentAction, replies = false }: { postId: string; initial: CommentDto[]; addAction?: AddCommentAction; replies?: boolean }) {
  const [list, setList] = useState(initial);
  const add = (c: CommentDto) => setList((cur) => [...cur, c]);
  useArrivedComment();

  // 원댓글 순서대로, 답글은 제 원댓글 밑으로. 원댓글이 숨겨져 짝이 없는 답글은 버린다 — 말을 건 상대가 안 보이는 답글은 뜻이 안 선다
  const roots = list.filter((c) => !c.parentId);
  const byParent = new Map<string, CommentDto[]>();
  for (const c of list) if (c.parentId) byParent.set(c.parentId, [...(byParent.get(c.parentId) ?? []), c]);
  const shown = roots.reduce((n, r) => n + 1 + (byParent.get(r.id)?.length ?? 0), 0);

  const send = async (text: string) => {
    // 망이 끊겨 액션 자체가 던지면 화면 전체 오류로 번지지 않게 칸 아래 오류로 접는다 — 쓴 글은 칸에 그대로 남는다
    const r = await addAction({ postId, body: text }).catch(() => ({ ok: false as const, error: M.failed }));
    if (!r.ok) return r.error;
    add(r.comment);
    return null;
  };

  return (
    <section aria-labelledby="comments-heading" className="flex flex-col gap-4">
      <h2 id="comments-heading" className="text-[16px] font-bold text-ink">
        {M.comments} <span className="text-acc">{shown}</span>
      </h2>
      {roots.length === 0 ? (
        <p className="rounded-xl bg-surface-2 px-4 py-4 text-[13.5px] text-dim">{M.commentEmpty}</p>
      ) : (
        <ul className="flex flex-col divide-y divide-line-soft">
          {roots.map((c) => (
            <Thread key={c.id} root={c} replies={byParent.get(c.id) ?? []} postId={postId} onAdded={add} addAction={addAction} canReply={replies} />
          ))}
        </ul>
      )}
      <CommentComposer action={`comment:${postId}`} label={M.commentPlaceholder} placeholder={M.commentPlaceholder} submitLabel={M.commentSubmit} send={send} />
    </section>
  );
}
