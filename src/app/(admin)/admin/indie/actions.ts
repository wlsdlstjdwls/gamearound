"use server";
// 인디 홍보 글 관리 Server Action — 숨기기, 되살리기, 게임 연결 확인과 끊기. 관리자 role 을 다시 본다(§6).
import { revalidatePath } from "next/cache";
import { indiePath, ROUTES } from "@/lib/routes";
import { INDIE_ADMIN_MESSAGES as A, INDIE_FORM_MESSAGES as M } from "@/lib/indie/messages";
import { indieModerationSchema } from "@/lib/indie/schemas";
import { moderateIndiePost } from "@/server/services/indie";
import { requireAdmin } from "@/server/services/users";

export type IndieModerationState = { ok: true; message: string } | { ok: false; error: string } | null;

export async function moderateIndiePostAction(_prev: IndieModerationState, formData: FormData): Promise<IndieModerationState> {
  try {
    const admin = await requireAdmin();
    const parsed = indieModerationSchema.safeParse({
      postId: formData.get("postId"),
      decision: formData.get("decision"),
      reason: String(formData.get("reason") ?? ""),
    });
    if (!parsed.success) return { ok: false, error: M.badRequest };
    const { slug } = await moderateIndiePost(parsed.data, admin.id);
    revalidatePath(ROUTES.adminIndie);
    revalidatePath(ROUTES.home);
    revalidatePath(ROUTES.indie);
    revalidatePath(indiePath(slug));
    return { ok: true, message: A.done };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : M.badRequest };
  }
}
