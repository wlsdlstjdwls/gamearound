import type { Metadata } from "next";
import { AUTH_MESSAGES as M } from "@/lib/auth/messages";
import { RESET_FLAG, safeNextPath } from "@/lib/routes";
import { AuthCard } from "@/components/auth/auth-card";
import { SignInForm } from "@/components/auth/sign-in-form";
import { FormMessage } from "@/components/ui/form-message";

export const metadata: Metadata = { title: "로그인" };

export default async function SignInPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const next = safeNextPath(Array.isArray(sp.next) ? sp.next[0] : sp.next);
  // 재설정을 마치고 넘어온 자리 — 무엇이 끝났는지 한 줄 말해 준다
  const resetDone = sp[RESET_FLAG.done] === "1";
  return (
    <AuthCard mode="signIn" subtitle={M.signInSubtitle} next={next}>
      {resetDone && <FormMessage tone="success">{M.resetDone}</FormMessage>}
      <SignInForm next={next} />
    </AuthCard>
  );
}
