// 첫 로그인 온보딩 영역 — 로그인 필수, 캐시 없음.
//
// (user) 와 따로 두는 이유: 저쪽은 머리띠와 푸터를 그대로 두는 영역이고 여기는 감추는 영역이다.
// 감추는 일 자체는 껍데기의 data-onboarding 표식이 하지만(globals.css), 라우트 그룹을 가르면
// 뒷날 "온보딩만" 적용할 규칙(진입 차단, 분석 이벤트)이 붙을 자리가 생긴다.
import { requireUserOrRedirect } from "@/server/auth/guards";

export const dynamic = "force-dynamic";

export default async function OnboardingLayout({ children }: { children: React.ReactNode }) {
  await requireUserOrRedirect();
  return children;
}
