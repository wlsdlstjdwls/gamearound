// 인증 페이지 공통 레이아웃 — 세션 쿠키가 있으면 proxy가 먼저 돌려보내지만, 만료 쿠키 등은 여기서 실제 검증해 한 번 더 막는다.
// 돌려보낼 곳은 ?next= 를 존중한다. layout 은 searchParams 를 받지 못하므로 proxy 가 넘긴 x-pathname 헤더에서 꺼낸다.
// (홈으로 고정하면 로그인 직후 router.refresh() 가 이 redirect 를 받아 next 목적지 대신 홈으로 튄다)
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { nextFromPathWithSearch } from "@/lib/routes";
import { PATHNAME_HEADER } from "@/proxy";
import { getCurrentUser } from "@/server/services/users";

export const dynamic = "force-dynamic";

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser().catch(() => null);
  if (user) redirect(nextFromPathWithSearch((await headers()).get(PATHNAME_HEADER)));
  return <div className="animate-fade-in">{children}</div>;
}
