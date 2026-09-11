import type { Metadata } from "next";
import { AUTH_MESSAGES as M } from "@/lib/auth/messages";
import { safeNextPath } from "@/lib/routes";
import { AuthCard } from "@/components/auth/auth-card";
import { SignUpForm } from "@/components/auth/sign-up-form";

export const metadata: Metadata = { title: "회원가입" };

export default async function SignUpPage({ searchParams }: { searchParams: Promise<{ next?: string | string[] }> }) {
  const sp = await searchParams;
  const next = safeNextPath(Array.isArray(sp.next) ? sp.next[0] : sp.next);
  return (
    <AuthCard title={M.signUpTitle} subtitle={M.signUpSubtitle}>
      <SignUpForm next={next} />
    </AuthCard>
  );
}
