"use server";
// 인디 게임 찜(2026-10-26, 명예의 전당, 슈퍼루키 점수의 재료), 댓글, 개발자 소식 받기(2026-10-27). 로그인 확인은 서비스가 다시 한다.
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { actionError } from "@/lib/db-errors";
import { commentInputSchema } from "@/lib/community/schemas";
import { COMMUNITY_MESSAGES as CM } from "@/lib/community/messages";
import { FAME_MESSAGES as M } from "@/lib/indie/fame";
import { INDIE_PROMO_MESSAGES as PM } from "@/lib/indie/promo-messages";
import { indiePath, ROUTES } from "@/lib/routes";
import { ACTION_MESSAGES } from "@/lib/messages";
import { WISHLIST_MESSAGES as WM } from "@/lib/wishlist/messages";
import { cardSlugSchema } from "@/lib/wishlist/schemas";
import { INDIE_WISHED_SLUGS_MAX } from "@/lib/indie/constants";
import { addIndieComment, isFollowingDeveloper, isIndieLiked, likedIndieSlugs, toggleDeveloperFollow, toggleIndieLike, toggleIndieLikeBySlug } from "@/server/services/indie";
import type { CommentDto } from "@/server/services/community";

const id = z.uuid();
const slugsSchema = z.array(cardSlugSchema).max(INDIE_WISHED_SLUGS_MAX);

export async function toggleIndieLikeAction(postId: string): Promise<{ ok: true; liked: boolean; likeCount: number } | { ok: false; error: string }> {
  if (!id.safeParse(postId).success) return { ok: false, error: M.empty };
  try {
    const r = await toggleIndieLike(postId);
    revalidatePath(ROUTES.wishlist);
    return { ok: true, ...r };
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

/** 카드 하트들의 찜 여부를 한 번에(components/wish-heart 의 indie 갈래). 비로그인, 실패는 빈 배열 — 하트가 빈 채로 선다 */
export async function likedIndieSlugsAction(slugs: string[]): Promise<string[]> {
  const parsed = slugsSchema.safeParse(slugs);
  if (!parsed.success) return [];
  return likedIndieSlugs(parsed.data).catch(() => []);
}

/** 목록 카드 하트의 토글(2026-10-29). 찜 목록에 인디 칸이 서므로 그 화면도 다시 그린다 */
export async function toggleIndieLikeBySlugAction(slug: string): Promise<{ ok: true; liked: boolean; likeCount: number } | { ok: false; error: string }> {
  const parsed = cardSlugSchema.safeParse(slug);
  if (!parsed.success) return { ok: false, error: WM.notFound };
  try {
    const r = await toggleIndieLikeBySlug(parsed.data);
    revalidatePath(ROUTES.wishlist);
    return { ok: true, ...r };
  } catch (e) {
    return { ok: false, error: actionError(e, ACTION_MESSAGES.failed) };
  }
}
