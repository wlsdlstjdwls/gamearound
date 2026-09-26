"use server";
// 직원 화면 Server Action — zod 로 검증하고 서비스로 넘긴다. 설계서 §9, §10.
//
// 초대, 취소, 내보내기는 **대표만** 한다. 매니저까지 열면 매니저가 다른 매니저를 들이고 내보내는 길이 생기고,
// 그러면 "누가 이 사람을 들였나" 의 답이 대표 손을 떠난다. 역할이 더 필요해지면 그때 넓힌다.
// 관리자는 requireShopRole 이 늘 통과시키고, 그 일은 감사 컬럼에 admin 으로 남는다.
import { revalidatePath } from "next/cache";
import { unstable_rethrow } from "next/navigation";
import { vendorStaffPath, staffInvitePath } from "@/lib/routes";
import { STAFF_MESSAGES } from "@/lib/shops/staff-messages";
import { inviteRevokeSchema, staffInviteSchema, staffRemoveSchema } from "@/lib/shops/staff-schemas";
import { openShopForAction } from "@/server/auth/shop-access";
import { createStaffInvite, removeStaffMember, revokeStaffInvite } from "@/server/services/shops";

/** 초대를 만들면 링크 경로를 돌려준다. 원문 토큰은 이 응답 한 번만 산다(services/shops/staff 주석) */
export type StaffState = { ok: true; message: string; invitePath?: string } | { ok: false; error: string } | null;

function openAsOwner(shopSlug: string) {
  return openShopForAction(shopSlug, STAFF_MESSAGES.notFound, "owner");
}

/**
 * 권한 없음(/forbidden)과 세션 만료(로그인) 이동은 예외로 온다. 삼키면 화면에 "NEXT_REDIRECT" 가 오류 문구로 뜬다 —
 * 그 둘은 흘려보내고 나머지만 문장으로 돌려준다(Next 문서 unstable_rethrow).
 */
function fail(e: unknown): StaffState {
  unstable_rethrow(e);
  return { ok: false, error: e instanceof Error ? e.message : STAFF_MESSAGES.badRequest };
}

export async function inviteStaffAction(shopSlug: string, _prev: StaffState, formData: FormData): Promise<StaffState> {
  try {
    const { shop, actor } = await openAsOwner(shopSlug);
    const parsed = staffInviteSchema.safeParse({
      email: String(formData.get("email") ?? ""),
      role: String(formData.get("role") ?? ""),
    });
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? STAFF_MESSAGES.badRequest };

    const token = await createStaffInvite(shop.id, parsed.data, actor);
    revalidatePath(vendorStaffPath(shopSlug));
    return { ok: true, message: STAFF_MESSAGES.created, invitePath: staffInvitePath(token) };
  } catch (e) {
    return fail(e);
  }
}

export async function revokeInviteAction(shopSlug: string, _prev: StaffState, formData: FormData): Promise<StaffState> {
  try {
    const { shop } = await openAsOwner(shopSlug);
    const parsed = inviteRevokeSchema.safeParse({ inviteId: String(formData.get("inviteId") ?? "") });
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? STAFF_MESSAGES.badRequest };

    await revokeStaffInvite(parsed.data.inviteId, shop.id);
    revalidatePath(vendorStaffPath(shopSlug));
    return { ok: true, message: STAFF_MESSAGES.revoked };
  } catch (e) {
    return fail(e);
  }
}

export async function removeStaffAction(shopSlug: string, _prev: StaffState, formData: FormData): Promise<StaffState> {
  try {
    const { shop, access } = await openAsOwner(shopSlug);
    const parsed = staffRemoveSchema.safeParse({ userId: String(formData.get("userId") ?? "") });
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? STAFF_MESSAGES.badRequest };

    await removeStaffMember(shop.id, parsed.data.userId, access.user.id);
    revalidatePath(vendorStaffPath(shopSlug));
    return { ok: true, message: STAFF_MESSAGES.removed };
  } catch (e) {
    return fail(e);
  }
}
