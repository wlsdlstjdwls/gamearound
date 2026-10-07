"use server";
// 예약 특전 글 판정 Server Action — 게임 잇기(공개까지), 공개, 숨기기. 관리자 role 을 다시 본다(§6).
import { revalidatePath } from "next/cache";
import { gamePath, ROUTES } from "@/lib/routes";
import { PREORDER_MESSAGES } from "@/lib/preorder/messages";
import { preorderModerationSchema } from "@/lib/preorder/schemas";
import { moderatePreorderPost } from "@/server/services/preorder-bonuses";
import { requireAdmin } from "@/server/services/users";

const A = PREORDER_MESSAGES.admin;

export type PreorderModerationState = { ok: true; message: string } | { ok: false; error: string } | null;

export async function moderatePreorderPostAction(_prev: PreorderModerationState, formData: FormData): Promise<PreorderModerationState> {
  try {
    const admin = await requireAdmin();
    const parsed = preorderModerationSchema.safeParse({
      postId: formData.get("postId"),
      decision: formData.get("decision"),
      gameSlug: String(formData.get("gameSlug") ?? "") || undefined,
    });
    if (!parsed.success) return { ok: false, error: A.badRequest };
    const { gameSlug } = await moderatePreorderPost(parsed.data, admin.id);
    revalidatePath(ROUTES.adminPreorder);
    // 상세의 특전 마디는 캐시 밖에서 받지만(services 주석) 머리 배지 등 다른 자리가 생길 때를 위해 화면도 새로 그린다
    if (gameSlug) revalidatePath(gamePath(gameSlug));
    return { ok: true, message: A.done };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : A.badRequest };
  }
}
