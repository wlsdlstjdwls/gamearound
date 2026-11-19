"use client";
// 관리자 로그인 화면에 이미 관리자로 들어와 있을 때 폼 대신 서는 칸. 문서를 새로 열어 관리자 영역으로 보낸다.
//
// 서버 redirect 를 쓰지 않는 이유(2026-11-19 사용자 "홈화면 아주 잠깐 노출", "로그인도 안 된다"): 로그인 액션이 세션 쿠키를 쓰면
// Next 가 지금 화면(이 로그인 화면)을 다시 그린다. 그때 서버 redirect 가 부드러운 이동을 걸고, 폼도 문서를 새로 열어 이동이 두 번 겹쳤다 —
// 그 사이 로그인 칸이 걷힌 사이트 머리띠만 있는 빈 화면이 비쳤다. 여기서 문서를 한 번만 새로 열면 그 겹침이 없다.
// 진입 인사 표식도 심는다 — 폼은 이 칸으로 바뀌며 사라져 제 이동 직전 단계를 못 탈 수 있다(lib/admin/greeting).
import { useEffect } from "react";
import { markAdminGreeting } from "@/lib/admin/greeting";
import { AUTH_MESSAGES as M } from "@/lib/auth/messages";
import { Button } from "@/components/ui/button";

export function AdminEntering({ next }: { next: string }) {
  useEffect(() => {
    markAdminGreeting();
    window.location.replace(next);
  }, [next]);
  return (
    <Button size="lg" fullWidth loading loadingLabel={M.adminEntering}>
      {M.adminEntering}
    </Button>
  );
}
