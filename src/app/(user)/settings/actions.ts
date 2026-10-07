"use server";
// 설정 화면의 개인화 끄기. 값 삭제는 services/profiles 의 revokeConsent 가 한 트랜잭션으로 한다(설계 §5).
//
// 실패를 던지지 않고 돌려주는 이유: 끄기는 확인창까지 거친 뒤라, 에러 화면으로 튀면
// "껐는지 안 껐는지" 를 사람이 알 수 없다. 버튼 옆에 한 줄로 말하는 편이 낫다.
import { revalidatePath } from "next/cache";
import { ROUTES } from "@/lib/routes";
import { ONBOARDING_MESSAGES as M } from "@/lib/onboarding/messages";
import { errorMessage } from "@/lib/errors";
import { resetPersonalization, revokeConsent, setPersonalizationPaused } from "@/server/services/profiles";

export type RevokeState = { ok: true } | { ok: false; error: string };

export async function revokePersonalizationAction(): Promise<RevokeState> {
  try {
    await revokeConsent();
  } catch (e) {
    console.error("[settings] 개인화 끄기 실패", errorMessage(e));
    return { ok: false, error: M.settings.offFailed };
  }
  // 홈 할인 줄의 개인화는 /api/me/picks 가 매번 새로 읽으므로 여기서 무효화할 것은 설정 화면뿐이다
  revalidatePath(ROUTES.settings);
  return { ok: true };
}

/** 사이트에 개인화 적용 토글(2026-10-07). 값은 지우지 않는다 — services/profiles 의 setPersonalizationPaused */
export async function setPersonalizationAppliedAction(applied: boolean): Promise<RevokeState> {
  try {
    await setPersonalizationPaused(!applied);
  } catch (e) {
    console.error("[settings] 개인화 적용 바꾸기 실패", errorMessage(e));
    return { ok: false, error: M.settings.applyFailed };
  }
  // 목록 기본 조건(getMyListPreset)은 요청마다 읽지만, 설정 화면의 요약은 이 경로 캐시에 있다
  revalidatePath(ROUTES.settings);
  return { ok: true };
}

/** 답 초기화. 성공하면 화면이 첫 질문으로 보낸다 — 여기서 redirect 하면 실패 줄을 띄울 자리가 없다 */
export async function resetPersonalizationAction(): Promise<RevokeState> {
  try {
    await resetPersonalization();
  } catch (e) {
    console.error("[settings] 개인화 초기화 실패", errorMessage(e));
    return { ok: false, error: M.settings.resetFailed };
  }
  revalidatePath(ROUTES.settings);
  return { ok: true };
}
