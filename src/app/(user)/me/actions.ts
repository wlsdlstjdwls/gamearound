"use server";
// 프로필 사진 적기, 되돌리기(기획서 v2.0 S-24). 올린 파일 주소가 내 경로(avatars/<내 ID>/)이고 Blob 저장소 주소일 때만 받는다.
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { actionError } from "@/lib/db-errors";
import { avatarPrefix, ME_MESSAGES as M } from "@/lib/me/constants";
import { ROUTES } from "@/lib/routes";
import { requireUser, setAvatar } from "@/server/services/users";

const input = z.object({ url: z.url(), pathname: z.string().min(1).max(300) });
/** Vercel Blob 공개 저장소 주소(next.config 의 images.remotePatterns 와 같은 호스트) */
const BLOB_HOST = /\.public\.blob\.vercel-storage\.com$/;

export async function setAvatarAction(raw: { url: string; pathname: string }): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const u = await requireUser();
    const p = input.safeParse(raw);
    if (!p.success || !p.data.pathname.startsWith(avatarPrefix(u.id)) || !BLOB_HOST.test(new URL(p.data.url).hostname)) return { ok: false, error: M.avatarFailed };
    await setAvatar(u.id, p.data.url);
    revalidatePath(ROUTES.me);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: actionError(e, M.avatarFailed) };
  }
}

export async function resetAvatarAction(): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const u = await requireUser();
    await setAvatar(u.id, null);
    revalidatePath(ROUTES.me);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: actionError(e, M.avatarFailed) };
  }
}
