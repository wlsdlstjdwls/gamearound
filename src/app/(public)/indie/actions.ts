"use server";
// 인디 게임 찜(2026-10-26, 명예의 전당, 슈퍼루키 점수의 재료). 로그인 확인은 서비스가 다시 한다.
import { z } from "zod";
import { actionError } from "@/lib/db-errors";
import { FAME_MESSAGES as M } from "@/lib/indie/fame";
import { isIndieLiked, toggleIndieLike } from "@/server/services/indie";

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
