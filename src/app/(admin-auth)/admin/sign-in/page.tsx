// 관리자 로그인(2026-10-30 회원 로그인에서 뗐다, 사용자 "관리자 로그인 화면은 분리").
//
// 주소는 /admin 아래지만 `(admin)` 그룹 밖, 제 그룹 `(admin-auth)` 에 둔다. `(admin)` 레이아웃은 들어오자마자
// requireRoleOrForbid("admin") 을 부르므로 그 안에 두면 로그인 화면이 자기 자신으로 돌려보낸다. proxy 도 이 주소만 가드에서 뺀다.
//
// 세션과 계정은 회원 쪽과 하나다 — 두 화면이 같은 SignInForm 과 같은 몸통 액션을 쓰고, 이 화면만 관리자 아닌 계정을 들이지 않는다.
// 관리자도 회원 /sign-in 으로 들어올 수 있다(같은 날 사용자).
//
// 회원 화면의 카피, 탭, 가입 링크는 싣지 않는다 — 관리자 콘솔 앞문이라 칸 둘과 단추 하나면 된다.
// 사이트 머리띠와 푸터는 globals.css 의 `body:has([data-admin-sign-in])` 가 걷는다(관리자 콘솔이 넓은 화면에서 머리띠를 걷는 것과 같은 결).
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AUTH_MESSAGES as M } from "@/lib/auth/messages";
import { adminNextPath } from "@/lib/auth/sign-in-path";
import { ROUTES } from "@/lib/routes";
import { SITE } from "@/lib/site";
import { SignInForm } from "@/components/auth/sign-in-form";
import { BrandSymbol } from "@/components/ui/logo";
import { Page, Panel } from "@/components/ui/page";
import { getCurrentUser } from "@/server/services/users";

export const metadata: Metadata = { title: M.adminSignInTitle, robots: { index: false, follow: false } };

export default async function AdminSignInPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const next = adminNextPath(Array.isArray(sp.next) ? sp.next[0] : sp.next);

  // 이미 관리자로 들어와 있으면 칸을 보일 이유가 없다. 회원 계정으로 들어와 있으면 칸을 그대로 보인다 — 관리자 계정으로 바꿔 들어오는 자리다
  const user = await getCurrentUser().catch(() => null);
  if (user?.role === "admin") redirect(next);

  return (
    <Page pad="auth" data-admin-sign-in className="flex-1 items-center justify-center">
      <Panel className="reveal flex w-full max-w-[400px] flex-col gap-5 p-6">
        <div className="flex flex-col gap-3">
          <Link href={ROUTES.home} aria-label={`${SITE.name} 홈`} className="press flex w-fit items-center gap-2">
            <BrandSymbol size={28} />
            <span className="rounded-full bg-acc-soft px-2.5 py-0.5 text-[12px] font-semibold text-acc">{M.adminSignInBadge}</span>
          </Link>
          <div className="flex flex-col gap-1">
            <h1 className="text-[22px] font-extrabold tracking-[-0.03em] text-ink">{M.adminSignInTitle}</h1>
            <p className="text-[13px] text-mut">{M.adminSignInSubtitle}</p>
          </div>
        </div>
        <SignInForm next={next} admin />
        <Link href={ROUTES.home} className="inline-flex h-11 items-center justify-center text-[13px] text-mut underline-offset-4 hover:text-ink hover:underline">
          {M.adminSignInToService}
        </Link>
      </Panel>
    </Page>
  );
}
