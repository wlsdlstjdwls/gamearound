// 첫 로그인 온보딩 영역 — 로그인 필수, 캐시 없음.
//
// (user) 와 따로 두는 이유: 저쪽은 머리띠와 푸터를 그대로 두는 영역이고 여기는 감추는 영역이다.
// 감추는 일 자체는 껍데기의 data-onboarding 표식이 하지만(globals.css), 라우트 그룹을 가르면
// 뒷날 "온보딩만" 적용할 규칙이 붙을 자리가 생긴다 — 아래 관리자 차단이 그 첫 규칙이다.
import { redirect } from "next/navigation";
import { ROUTES } from "@/lib/routes";
import { requireUserOrRedirect } from "@/server/auth/guards";
import { canPersonalize } from "@/server/services/profiles";

export const dynamic = "force-dynamic";

export default async function OnboardingLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUserOrRedirect();
  // 개인화를 못 켜는 계정(게임사, 매장)은 여기서 막는다. 막는 자리를 여기 하나로 두는 이유는
  // 들어오는 문이 여럿이기 때문이다 — 가입 직후 리다이렉트, /welcome 재개, 주소 직접 입력.
  // 관리자는 2026-10-07 부터 들어온다(설정에서 스스로 켜는 길). 첫 로그인에 끌려오지 않는 건 인증 레이아웃이 따로 지킨다
  if (!canPersonalize(user.role)) redirect(ROUTES.home);
  return children;
}
