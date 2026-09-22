// /welcome — 화면이 아니라 문이다. 재개 지점으로 넘기기만 한다.
//
// 재개를 여기서 푸는 이유: 단계 주소를 직접 기억하는 것은 사람의 일이 아니다. 알림, 메일,
// 설정 화면이 전부 /welcome 하나만 가리키게 두고 "어디까지 했는지" 는 DB 가 안다.
import { redirect } from "next/navigation";
import { ROUTES, welcomeStepPath } from "@/lib/routes";
import { getMyProfile } from "@/server/services/profiles";

export default async function WelcomeEntryPage() {
  const profile = await getMyProfile();
  // 이미 마친 사람을 다시 붙잡지 않는다. 다시 답하려면 설정에서 들어온다(설계 §5)
  if (profile.onboardingDoneAt) redirect(ROUTES.home);
  redirect(welcomeStepPath(profile.onboardingStep ?? "intro"));
}
