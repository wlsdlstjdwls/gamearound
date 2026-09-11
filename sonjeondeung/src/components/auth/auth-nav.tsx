"use client";
// 헤더 우측 인증 영역 — 세션 확인 중엔 스켈레톤(깜빡임 방지), 비로그인은 로그인/가입, 로그인은 UserMenu.
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AUTH_MESSAGES as M } from "@/lib/auth/messages";
import { ROUTES, signInPath } from "@/lib/routes";
import { useSession } from "@/components/auth/session-provider";
import { UserMenu } from "@/components/auth/user-menu";
import { buttonClass } from "@/components/ui/button";

export function AuthNav() {
  const { user, status } = useSession();
  const pathname = usePathname();

  if (status === "loading") {
    return <span aria-hidden className="skeleton h-9 w-20 rounded-full" />;
  }
  if (user) return <UserMenu user={user} />;

  const isAuthPage = pathname.startsWith(ROUTES.signIn) || pathname.startsWith(ROUTES.signUp);
  return (
    <div className="flex items-center gap-2 animate-fade-in">
      {!isAuthPage && (
        <Link href={ROUTES.signUp} className="hidden text-sm text-mut transition-colors hover:text-ink sm:block">
          {M.signUpCta}
        </Link>
      )}
      <Link href={isAuthPage ? ROUTES.signIn : signInPath(pathname)} className={buttonClass({ size: "sm" })}>
        {M.signInCta}
      </Link>
    </div>
  );
}
