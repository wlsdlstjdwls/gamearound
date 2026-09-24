"use server";
// 설정 화면의 개인화 끄기. 값 삭제는 services/profiles 의 revokeConsent 가 한 트랜잭션으로 한다(설계 §5).
//
// 실패를 던지지 않고 돌려주는 이유: 끄기는 확인창까지 거친 뒤라, 에러 화면으로 튀면
// "껐는지 안 껐는지" 를 사람이 알 수 없다. 버튼 옆에 한 줄로 말하는 편이 낫다.
import { revalidatePath } from "next/cache";
import { ROUTES } from "@/lib/routes";
import { ONBOARDING_MESSAGES as M } from "@/lib/onboarding/messages";
import { errorMessage } from "@/lib/errors";
import { revokeConsent } from "@/server/services/profiles";

export type RevokeState = { ok: true } | { ok: false; error: string };

export async function revokePersonalizationAction(): Promise<RevokeState> {
  try {
    await revokeConsent();
  } catch (e) {
    console.error("[settings] 개인화 끄기 실패", errorMessage(e));
    return { ok: false, error: M.settings.offFailed };
  }
  // 홈 취향 줄은 /api/me/picks 가 매번 새로 읽으므로 여기서 무효화할 것은 설정 화면뿐이다
  revalidatePath(ROUTES.settings);
  return { ok: true };
}
