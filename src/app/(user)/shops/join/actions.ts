"use server";
// 입점 신청 Server Action — zod 로 검증하고 서비스로 넘긴다(설계서 §5.2).
// proxy 가 로그인을 보지만 여기서 다시 본다(§6) — 액션은 주소로 직접 불릴 수 있다.
import { revalidatePath } from "next/cache";
import { ROUTES } from "@/lib/routes";
import { SHOP_MESSAGES } from "@/lib/shops/messages";
import { shopApplicationSchema } from "@/lib/shops/schemas";
import { applyForShop } from "@/server/services/shops";
import { requireUser } from "@/server/services/users";

export type ShopJoinState = { ok: true; message: string } | { ok: false; error: string } | null;

export async function applyForShopAction(_prev: ShopJoinState, formData: FormData): Promise<ShopJoinState> {
  try {
    await requireUser();
    const text = (name: string) => String(formData.get(name) ?? "").trim();
    const parsed = shopApplicationSchema.safeParse({
      // 개인 판매자는 아직 열지 않았다. 폼이 안 보여 줄 뿐 아니라 여기서도 받지 않는다 —
      // 화면만 막으면 폼에 값을 박아 보내는 길이 남는다(설계서 §10 의 첫 공격)
      shopType: "business",
      name: text("name"),
      slug: text("slug"),
      bizRegNo: text("bizRegNo"),
      addressType: text("addressType") || "offline",
      address: text("address"),
      addressDetail: text("addressDetail"),
      phone: text("phone"),
      description: text("description"),
    });
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? SHOP_MESSAGES.badRequest };

    await applyForShop(parsed.data);
    revalidatePath(ROUTES.shopsJoinStatus);
    revalidatePath(ROUTES.shopsJoin);
    return { ok: true, message: SHOP_MESSAGES.applied };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : SHOP_MESSAGES.badRequest };
  }
}
