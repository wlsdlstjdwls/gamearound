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
  // 이 껍데기가 main 이 남긴 높이를 그대로 흘려보내야 안쪽 화면이 세로 가운데에 설 수 있다.
  // 백분율(h-full)이 아니라 flex-1 로 받는 이유는 root layout 의 main 주석에 적어 두었다.
  // 없으면 넓은 화면에서 폼이 위에 붙고 그 아래가 통째로 빈다(2026-09-22 실측: 1440x950 에서
  // 본문이 604px 에서 끝나고 271px 이 남았다).
  return <div className="flex flex-1 flex-col animate-fade-in">{children}</div>;
}
