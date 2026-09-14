import type { Metadata } from "next";
import { AUTH_MESSAGES as M } from "@/lib/auth/messages";
import { safeNextPath } from "@/lib/routes";
import { AuthCard } from "@/components/auth/auth-card";
import { SignInForm } from "@/components/auth/sign-in-form";

export const metadata: Metadata = { title: "로그인" };

export default async function SignInPage({ searchParams }: { searchParams: Promise<{ next?: string | string[] }> }) {
  const sp = await searchParams;
  const next = safeNextPath(Array.isArray(sp.next) ? sp.next[0] : sp.next);
  return (
    <AuthCard mode="signIn" subtitle={M.signInSubtitle} next={next}>
      <SignInForm next={next} />
    </AuthCard>
  );
}
