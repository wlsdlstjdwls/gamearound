"use server";
// 관리자 메뉴 즐겨찾기 켜기, 끄기. 화면은 누른 순간 먼저 바꾸고 이 결과가 실패일 때만 되돌린다(nav-favorites).
// 캐시를 무효화하지 않는다 — 즐겨찾기는 기둥이 들고 있는 상태라 다시 그릴 서버 화면이 없다.
import { z } from "zod";
import { requireAdmin } from "@/server/services/users";
import { setAdminFavorite } from "@/server/services/admin-favorites";
import { ADMIN_FAVORITE_HREF } from "@/lib/admin/favorites";

const schema = z.object({ href: z.string().max(ADMIN_FAVORITE_HREF.maxLength).regex(ADMIN_FAVORITE_HREF.pattern), on: z.boolean() });

export async function toggleAdminFavorite(href: string, on: boolean): Promise<{ ok: boolean }> {
  const user = await requireAdmin();
  const parsed = schema.safeParse({ href, on });
  if (!parsed.success) return { ok: false };
  try {
    await setAdminFavorite(user.id, parsed.data.href, parsed.data.on);
    return { ok: true };
  } catch {
    return { ok: false };
  }
}
