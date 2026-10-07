// 메일 링크가 여는 화면. 링크가 죽었으면 폼 대신 다시 받는 길을 준다 — 폼을 다 채운 뒤에 "만료" 를 듣지 않게.
import type { Metadata } from "next";
import Link from "next/link";
import { AUTH_MESSAGES as M } from "@/lib/auth/messages";
import { ROUTES } from "@/lib/routes";
import { isResetTokenUsable } from "@/server/services/password-reset";
import { AuthCard } from "@/components/auth/auth-card";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import { buttonClass } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/form-message";

// 주소에 토큰이 있다 — 이 화면에서 밖으로 나가는 요청(이미지, 링크)에 주소가 Referer 로 실리지 않게 한다
export const metadata: Metadata = { title: M.forgotTitle, referrer: "no-referrer", robots: { index: false } };

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string | string[] }> }) {
  const raw = (await searchParams).token;
  const token = Array.isArray(raw) ? raw[0] : raw;
  const usable = token ? await isResetTokenUsable(token).catch(() => false) : false;

  return (
    <AuthCard mode="reset" subtitle={M.resetSubtitle} next={ROUTES.home}>
      {usable && token ? (
        <ResetPasswordForm token={token} />
      ) : (
        <div className="space-y-4">
          <FormMessage tone="error">{M.resetInvalid}</FormMessage>
          <Link href={ROUTES.forgotPassword} className={buttonClass({ size: "lg", fullWidth: true })}>
            {M.resetRequestAgain}
          </Link>
        </div>
      )}
    </AuthCard>
  );
}
