import type { Metadata } from "next";
import { AUTH_MESSAGES as M } from "@/lib/auth/messages";
import { RESET_FLAG, ROUTES } from "@/lib/routes";
import { AuthCard } from "@/components/auth/auth-card";
import { BackToSignIn, ForgotPasswordForm } from "@/components/auth/forgot-password-form";
import { FormMessage } from "@/components/ui/form-message";

export const metadata: Metadata = { title: M.forgotTitle };

export default async function ForgotPasswordPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sent = (await searchParams)[RESET_FLAG.sent] === "1";
  return (
    <AuthCard mode="reset" subtitle={M.forgotSubtitle} next={ROUTES.home}>
      {sent ? (
        <div className="space-y-4">
          <FormMessage tone="success">{M.forgotSent}</FormMessage>
          <BackToSignIn index={1} />
        </div>
      ) : (
        <ForgotPasswordForm />
      )}
    </AuthCard>
  );
}
