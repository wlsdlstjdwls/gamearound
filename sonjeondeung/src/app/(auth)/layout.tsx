// 인증 페이지 공통 레이아웃 — 세션 쿠키가 있으면 proxy가 먼저 돌려보내지만, 만료 쿠키 등은 여기서 실제 검증해 한 번 더 막는다.
import { redirect } from "next/navigation";
import { ROUTES } from "@/lib/routes";
import { getCurrentUser } from "@/server/services/users";

export const dynamic = "force-dynamic";

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser().catch(() => null);
  if (user) redirect(ROUTES.home);
  return <div className="animate-fade-in">{children}</div>;
}
