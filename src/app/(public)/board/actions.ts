"use server";
// 게시판 서버 액션 — 글쓰기, 좋아요, 저장, 댓글(기획서 v2.0 6.1, 6.4). 라운지 글도 같은 액션을 쓴다(테이블이 하나다).
// 입력 모양은 zod 로 보고, 로그인과 소유자 확인은 서비스가 다시 한다.
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { actionError } from "@/lib/db-errors";
import { CATEGORY_LIST_PATH, postPath } from "@/lib/community/constants";
import { COMMUNITY_MESSAGES as M } from "@/lib/community/messages";
import { commentInputSchema, postInputSchema } from "@/lib/community/schemas";
import { addComment, createPost, PostGameNotFoundError, PostIndieNotFoundError, toggleLike, toggleSave, type CommentDto } from "@/server/services/community";
import { notifyComment, notifyReply } from "@/server/services/notifications";
import { notifyFollowersOfDevlog } from "@/server/services/indie";

export type PostActionState = { ok: true; redirectTo: string } | { ok: false; error?: string; fieldErrors?: Record<string, string> } | null;

const idSchema = z.uuid();

export async function createPostAction(input: Record<string, string>): Promise<PostActionState> {
  const parsed = postInputSchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? "form");
      fieldErrors[key] ??= issue.message;
    }
    return { ok: false, fieldErrors };
  }
  try {
    const row = await createPost(parsed.data);
    // 개발일지는 개발자 소식을 받는 사람의 알림함으로 간다(2026-10-27). 알림은 덤이다 — 실패해도 글은 섰다
    if (row.category === "devlog") await notifyFollowersOfDevlog({ authorUserId: row.authorUserId, postId: row.id, title: row.title, category: row.category }).catch(() => {});
    revalidatePath(CATEGORY_LIST_PATH[row.category]);
    // 등록 뒤 그 카테고리의 목록으로 간다(기획서 6.4 "등록 후 이동")
    return { ok: true, redirectTo: CATEGORY_LIST_PATH[row.category] };
  } catch (e) {
    // 고른 게임이 그새 사라졌으면 폼 맨 아래가 아니라 관련 게임 칸 아래에 말한다 — 고칠 자리가 거기다
    if (e instanceof PostGameNotFoundError) return { ok: false, fieldErrors: { gameSlug: M.gameNotFound } };
    if (e instanceof PostIndieNotFoundError) return { ok: false, fieldErrors: { indieSlug: M.indieNotFound } };
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
