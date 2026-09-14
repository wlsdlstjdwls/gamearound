// 로그인 필수 영역 공통 레이아웃 (§5.1: 사용자 데이터 페이지는 dynamic, 캐시 안 함)
// proxy는 쿠키 유무만 보므로 여기서 세션을 실제 검증한다 — 폐기된 쿠키로 들어오면 에러 화면 대신 로그인으로.
// 내비게이션은 헤더와 계정 메뉴가 담당한다(리디자인: 서브 내비 제거).
import { requireUserOrRedirect } from "@/server/auth/guards";

export const dynamic = "force-dynamic";

export default async function UserLayout({ children }: { children: React.ReactNode }) {
  await requireUserOrRedirect();
  return <div className="animate-fade-in">{children}</div>;
}
