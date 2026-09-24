"use client";
// 로그아웃 공용 훅 — 헤더 메뉴와 설정 페이지가 같은 흐름을 쓴다: 서버 세션 폐기 → 클라이언트 세션 null → 홈으로.
//
// 액션이 실패하면 예외를 던지지 않고 홈을 **새로 불러온다**(2026-09-24).
// 이 훅은 머리글, 즉 루트 레이아웃 안에서 돈다. 전환(startTransition) 안에서 던진 예외는 그 컴포넌트의
// 가장 가까운 에러 바운더리로 가는데, 루트 레이아웃 위에는 app/error.tsx 가 없다 — 한 번의 요청 실패가
// 앱 전체를 에러 화면으로 바꿨다(폰에서 요청이 서버에 닿지도 않은 채 재현됐다, 운영 로그에 POST 0건).
// 새로 불러오면 머리글이 서버에 다시 묻는다: 로그아웃이 됐으면 비로그인, 안 됐으면 로그인 그대로라
// 다시 누르면 된다. "됐다" 고 거짓으로 비워 두는 것보다 낫다.
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
      try {
        await signOutAction();
      } catch (e) {
        console.error("[auth] 로그아웃 요청 실패:", e);
        window.location.assign(ROUTES.home);
        return;
      }
      setUser(null);
      onDone?.();
      router.push(ROUTES.home);
      router.refresh();
    });

  return { signOut, pending };
}
