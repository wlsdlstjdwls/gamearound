"use server";
// 직원 초대 수락 — 설계서 §9. 판정 규칙은 lib/shops/staff-schemas 의 judgeInvite 한 곳이다.
import { redirect, unstable_rethrow } from "next/navigation";
import { vendorListingsPath } from "@/lib/routes";
import { STAFF_MESSAGES } from "@/lib/shops/staff-messages";
import { acceptStaffInvite } from "@/server/services/shops";
import { requireUser } from "@/server/services/users";

export type AcceptState = { ok: false; error: string } | null;

// 앞선 상태와 폼 값을 받지 않는다 — 토큰 하나면 된다(useActionState 는 인자를 덜 받는 함수도 받는다)
export async function acceptInviteAction(token: string): Promise<AcceptState> {
  let slug: string;
  try {
    const user = await requireUser();
    slug = await acceptStaffInvite(token, { id: user.id, email: user.email });
  } catch (e) {
    unstable_rethrow(e);
    return { ok: false, error: e instanceof Error ? e.message : STAFF_MESSAGES.badRequest };
  }
  // redirect 는 예외로 동작한다 — try 밖에서 불러야 위 catch 가 삼키지 않는다
  redirect(vendorListingsPath(slug));
}
