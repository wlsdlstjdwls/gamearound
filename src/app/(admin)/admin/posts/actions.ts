"use server";
// 게시글, 댓글 숨김과 되살림 Server Action. 관리자 role 을 다시 본다(§6).
// 버튼은 누른 순간 이미 바뀌어 있고(components/admin/content-moderation), 여기서 실패하면 화면이 되돌린다.
import { revalidatePath } from "next/cache";
import { actionError } from "@/lib/db-errors";
import { POST_ADMIN_MESSAGES as M } from "@/lib/admin/messages";
import { contentModerationSchema, type ContentModerationInput } from "@/lib/admin/moderation-schema";
import { ROUTES } from "@/lib/routes";
import { moderateComment, moderatePost } from "@/server/services/community";
import { moderateIndieComment } from "@/server/services/indie";
import { requireAdmin } from "@/server/services/users";

export type ContentModerationResult = { ok: true } | { ok: false; error: string };

export async function moderateContentAction(input: ContentModerationInput): Promise<ContentModerationResult> {
  try {
    const admin = await requireAdmin();
    const parsed = contentModerationSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: M.failed };
    const { kind, id, decision } = parsed.data;
    const { href } =
      kind === "post" ? await moderatePost(id, decision, admin.id) : kind === "comment" ? await moderateComment(id, decision, admin.id) : await moderateIndieComment(id, decision, admin.id);
    revalidatePath(ROUTES.adminPosts);
    // 숨긴 글은 목록, 인기글, 게시판 홈 소식 어디에도 서면 안 된다 — 두 갈래의 화면을 통째로 민다
    revalidatePath(ROUTES.board, "layout");
    revalidatePath(ROUTES.lounge, "layout");
    if (href) revalidatePath(href);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: actionError(e, M.failed) };
  }
}
