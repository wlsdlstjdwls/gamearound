"use client";
// 로그아웃 공용 훅 — 헤더 메뉴와 설정 페이지가 같은 흐름을 쓴다: 서버 세션 폐기 → 클라이언트 세션 null → 홈으로.
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { signOutAction } from "@/app/(auth)/actions";
import { ROUTES } from "@/lib/routes";
import { useSession } from "@/components/auth/session-provider";

export function useSignOut(onDone?: () => void) {
  const router = useRouter();
  const { setUser } = useSession();
  const [pending, start] = useTransition();

  const signOut = () =>
    start(async () => {
      await signOutAction();
      setUser(null);
      onDone?.();
      router.push(ROUTES.home);
      router.refresh();
    });

  return { signOut, pending };
}
