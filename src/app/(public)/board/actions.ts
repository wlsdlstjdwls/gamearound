"use server";
// 게시판 서버 액션 — 글쓰기, 고치기, 지우기, 좋아요, 저장, 댓글(기획서 v2.0 6.1, 6.4). 라운지 글도 같은 액션을 쓴다(테이블이 하나다).
// 입력 모양은 zod 로 보고, 로그인과 소유자 확인은 서비스가 다시 한다.
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { actionError } from "@/lib/db-errors";
import { CATEGORY_LIST_PATH, postPath } from "@/lib/community/constants";
import { COMMUNITY_MESSAGES as M } from "@/lib/community/messages";
import { commentEditSchema, commentInputSchema, postInputSchema } from "@/lib/community/schemas";
import { addComment, createPost, deleteComment, deletePost, updateComment, PostGameNotFoundError, PostIndieNotFoundError, toggleLike, toggleSave, updatePost, type CommentDto } from "@/server/services/community";
import { notifyComment, notifyReply } from "@/server/services/notifications";
import { notifyFollowersOfDevlog } from "@/server/services/indie";

export type PostActionState = { ok: true; redirectTo: string } | { ok: false; error?: string; fieldErrors?: Record<string, string> } | null;

const idSchema = z.uuid();

/** 칸마다 첫 오류 하나. 등록과 고치기가 같이 쓴다 */
function fieldErrorsOf(issues: { path: PropertyKey[]; message: string }[]): Record<string, string> {
  const fieldErrors: Record<string, string> = {};
  for (const issue of issues) fieldErrors[String(issue.path[0] ?? "form")] ??= issue.message;
  return fieldErrors;
}

/** 고른 게임이 그새 사라졌으면 폼 맨 아래가 아니라 관련 게임 칸 아래에 말한다 — 고칠 자리가 거기다 */
function postFailure(e: unknown, fallback: string): PostActionState {
  if (e instanceof PostGameNotFoundError) return { ok: false, fieldErrors: { gameSlug: M.gameNotFound } };
  if (e instanceof PostIndieNotFoundError) return { ok: false, fieldErrors: { indieSlug: M.indieNotFound } };
  return { ok: false, error: actionError(e, fallback) };
}

export async function createPostAction(input: Record<string, string>): Promise<PostActionState> {
  const parsed = postInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, fieldErrors: fieldErrorsOf(parsed.error.issues) };
  try {
    const row = await createPost(parsed.data);
    // 개발일지는 개발자 소식을 받는 사람의 알림함으로 간다(2026-10-27). 알림은 덤이다 — 실패해도 글은 섰다
    if (row.category === "devlog") await notifyFollowersOfDevlog({ authorUserId: row.authorUserId, postId: row.id, title: row.title, category: row.category }).catch(() => {});
    revalidatePath(CATEGORY_LIST_PATH[row.category]);
    // 등록 뒤 그 카테고리의 목록으로 간다(기획서 6.4 "등록 후 이동")
    return { ok: true, redirectTo: CATEGORY_LIST_PATH[row.category] };
  } catch (e) {
    return postFailure(e, M.failed);
  }
}

/** 고치기. 저장 뒤 고친 글로 돌아간다 — 목록으로 보내면 방금 고친 것을 다시 찾아 들어가야 한다 */
export async function updatePostAction(id: string, input: Record<string, string>): Promise<PostActionState> {
  if (!idSchema.safeParse(id).success) return { ok: false, error: M.notFound };
  const parsed = postInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, fieldErrors: fieldErrorsOf(parsed.error.issues) };
  try {
    const row = await updatePost(id, parsed.data);
    const path = postPath(row.id, row.category);
    revalidatePath(path);
    revalidatePath(CATEGORY_LIST_PATH[row.category]);
    return { ok: true, redirectTo: path };
  } catch (e) {
    return postFailure(e, M.failed);
  }
}

/** 지우기. 지운 뒤 그 카테고리 목록으로 간다(부르는 쪽이 redirectTo 로 옮긴다) */
export async function deletePostAction(id: string): Promise<{ ok: true; redirectTo: string } | { ok: false; error: string }> {
  if (!idSchema.safeParse(id).success) return { ok: false, error: M.notFound };
  try {
    const { category } = await deletePost(id);
    revalidatePath(CATEGORY_LIST_PATH[category]);
    return { ok: true, redirectTo: CATEGORY_LIST_PATH[category] };
  } catch (e) {
    return { ok: false, error: actionError(e, M.failed) };
  }
}

export async function toggleLikeAction(postId: string): Promise<{ ok: true; liked: boolean; likeCount: number } | { ok: false; error: string }> {
  if (!idSchema.safeParse(postId).success) return { ok: false, error: M.notFound };
  try {
    return { ok: true, ...(await toggleLike(postId)) };
  } catch (e) {
    return { ok: false, error: actionError(e, M.failed) };
  }
}

export async function toggleSaveAction(postId: string): Promise<{ ok: true; saved: boolean } | { ok: false; error: string }> {
  if (!idSchema.safeParse(postId).success) return { ok: false, error: M.notFound };
  try {
    return { ok: true, ...(await toggleSave(postId)) };
  } catch (e) {
    return { ok: false, error: actionError(e, M.failed) };
  }
}

export async function addCommentAction(input: { postId: string; body: string; parentId?: string | null }): Promise<{ ok: true; comment: CommentDto } | { ok: false; error: string }> {
  const parsed = commentInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? M.failed };
  try {
    const r = await addComment(parsed.data.postId, parsed.data.body, parsed.data.parentId ?? null);
    // 알림은 덤이다 — 실패해도 댓글은 이미 섰다. 답글은 원댓글 주인에게, 그 사람이 글쓴이면 글 알림 하나로 갈음한다(같은 소식 두 번 안 가게)
    const toParent = r.parentAuthorId && r.parentAuthorId !== r.postAuthorId;
    await (toParent
      ? Promise.all([
          notifyReply({ postId: parsed.data.postId, parentAuthorId: r.parentAuthorId!, postTitle: r.postTitle, category: r.category }),
          notifyComment({ postId: parsed.data.postId, postAuthorId: r.postAuthorId, postTitle: r.postTitle, category: r.category }),
        ])
      : notifyComment({ postId: parsed.data.postId, postAuthorId: r.postAuthorId, postTitle: r.postTitle, category: r.category })
    ).catch(() => {});
    revalidatePath(postPath(parsed.data.postId, r.category as Parameters<typeof postPath>[1]));
    return { ok: true, comment: r.comment };
  } catch (e) {
    return { ok: false, error: actionError(e, M.failed) };
  }
}

/** 댓글 고치기, 지우기(2026-10-30). 화면은 누른 즉시 바꾸고 실패하면 되돌린다(components/community/comment-item) */
export type CommentEditResult = { ok: true; body: string } | { ok: false; error: string };
export type CommentDeleteResult = { ok: true } | { ok: false; error: string };

export async function updateCommentAction(id: string, body: string): Promise<CommentEditResult> {
  const parsed = commentEditSchema.safeParse({ id, body });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? M.failed };
  try {
    const r = await updateComment(parsed.data.id, parsed.data.body);
    revalidatePath(postPath(r.postId, r.category));
    return { ok: true, body: r.body };
  } catch (e) {
    return { ok: false, error: actionError(e, M.failed) };
  }
}

export async function deleteCommentAction(id: string): Promise<CommentDeleteResult> {
  if (!idSchema.safeParse(id).success) return { ok: false, error: M.failed };
  try {
    const r = await deleteComment(id);
    revalidatePath(postPath(r.postId, r.category));
    return { ok: true };
  } catch (e) {
    return { ok: false, error: actionError(e, M.failed) };
  }
}
