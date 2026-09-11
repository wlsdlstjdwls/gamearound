"use client";
import { AUTH_MESSAGES as M } from "@/lib/auth/messages";
import { useSignOut } from "@/components/auth/use-sign-out";
import { Button, type ButtonProps } from "@/components/ui/button";
import { LogOutIcon } from "@/components/ui/icons";

export function SignOutButton(props: Omit<ButtonProps, "onClick" | "loading" | "children">) {
  const { signOut, pending } = useSignOut();
  return (
    <Button variant="danger" size="sm" onClick={signOut} loading={pending} {...props}>
      <LogOutIcon size={16} />
      {M.signOutCta}
    </Button>
  );
}
