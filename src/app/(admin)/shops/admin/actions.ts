"use server";
// 입점 심사 Server Action. 경로를 /admin 밖으로 뺀 것은 실수 방지고, 권한 검사는 여기다(설계서 §11).
// 페이지가 막혀 있어도 액션은 주소로 직접 불릴 수 있다 — 그래서 액션마다 다시 본다(§6).
import { revalidatePath } from "next/cache";
import { ROUTES } from "@/lib/routes";
import { SHOP_ADMIN_MESSAGES, SHOP_MESSAGES } from "@/lib/shops/messages";
import { shopReviewSchema } from "@/lib/shops/schemas";
import { reviewShop } from "@/server/services/shops";
import { requireRole } from "@/server/services/users";

export type ShopReviewState = { ok: true; message: string } | { ok: false; error: string } | null;

const DONE: Record<string, string> = {
  approve: SHOP_ADMIN_MESSAGES.approved,
  reject: SHOP_ADMIN_MESSAGES.rejected,
  suspend: SHOP_ADMIN_MESSAGES.suspended,
  reactivate: SHOP_ADMIN_MESSAGES.reactivated,
};

export async function reviewShopAction(_prev: ShopReviewState, formData: FormData): Promise<ShopReviewState> {
  try {
    const admin = await requireRole("admin");
    const parsed = shopReviewSchema.safeParse({
      shopId: String(formData.get("shopId") ?? ""),
      decision: String(formData.get("decision") ?? ""),
      reason: String(formData.get("reason") ?? "").trim() || undefined,
    });
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? SHOP_MESSAGES.badRequest };

    await reviewShop(parsed.data, admin);
    revalidatePath(ROUTES.shopsAdmin);
    // 매장주가 보는 화면도 같이 푼다 — 승인해 놓고 신청자 화면이 "심사 중" 이면 문의가 그리로 온다
    revalidatePath(ROUTES.shopsJoinStatus);
    return { ok: true, message: DONE[parsed.data.decision] ?? SHOP_ADMIN_MESSAGES.approved };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : SHOP_MESSAGES.badRequest };
  }
}
