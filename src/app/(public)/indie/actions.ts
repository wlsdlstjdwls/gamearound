"use server";
// 인디 게임 찜(2026-10-26, 명예의 전당, 슈퍼루키 점수의 재료), 댓글, 개발자 소식 받기(2026-10-27). 로그인 확인은 서비스가 다시 한다.
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { actionError } from "@/lib/db-errors";
import { commentInputSchema } from "@/lib/community/schemas";
import { COMMUNITY_MESSAGES as CM } from "@/lib/community/messages";
import { FAME_MESSAGES as M } from "@/lib/indie/fame";
import { INDIE_PROMO_MESSAGES as PM } from "@/lib/indie/promo-messages";
import { indiePath } from "@/lib/routes";
import { addIndieComment, isFollowingDeveloper, isIndieLiked, toggleDeveloperFollow, toggleIndieLike } from "@/server/services/indie";
import type { CommentDto } from "@/server/services/community";

const id = z.uuid();

export async function toggleIndieLikeAction(postId: string): Promise<{ ok: true; liked: boolean; likeCount: number } | { ok: false; error: string }> {
  if (!id.safeParse(postId).success) return { ok: false, error: M.empty };
  try {
    return { ok: true, ...(await toggleIndieLike(postId)) };
  } catch (e) {
    return { ok: false, error: actionError(e, "처리하지 못했어요") };
  }
}

export async function isIndieLikedAction(postId: string): Promise<boolean> {
  if (!id.safeParse(postId).success) return false;
  return isIndieLiked(postId).catch(() => false);
}

/** 인디 글 댓글. 게시판 댓글과 입력 규칙(commentInputSchema)과 부품이 같다 — 받는 액션만 다르다(components/community/post-interactions) */
export async function addIndieCommentAction(input: { postId: string; body: string }): Promise<{ ok: true; comment: CommentDto } | { ok: false; error: string }> {
  const parsed = commentInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? CM.failed };
  try {
    const r = await addIndieComment(parsed.data.postId, parsed.data.body);
    revalidatePath(indiePath(r.slug));
    return { ok: true, comment: r.comment };
  } catch (e) {
    return { ok: false, error: actionError(e, CM.failed) };
  }
}

export async function toggleDeveloperFollowAction(developerUserId: string): Promise<{ ok: true; following: boolean } | { ok: false; error: string }> {
  if (!id.safeParse(developerUserId).success) return { ok: false, error: PM.followFailed };
  try {
    return { ok: true, ...(await toggleDeveloperFollow(developerUserId)) };
  } catch (e) {
    return { ok: false, error: actionError(e, PM.followFailed) };
  }
}

export async function isFollowingDeveloperAction(developerUserId: string): Promise<boolean> {
  if (!id.safeParse(developerUserId).success) return false;
  return isFollowingDeveloper(developerUserId).catch(() => false);
}
