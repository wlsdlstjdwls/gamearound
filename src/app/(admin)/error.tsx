"use client";
// 관리자 화면 오류 바운더리. 회원 오류 안내(app/error)는 "홈으로" 를 권하고 왼쪽 메뉴까지 걷는다.
// 이 파일이 관리자 레이아웃 곁((admin))에 있으면 경계가 판 안으로 내려온다 — 메뉴, 탭은 살아 있고 판만 시스템 메시지로 바뀐다(admin/screen/fault).
// 레이아웃 자체(역할 검사, 메뉴)가 던진 오류는 여기로 오지 않고 app/error 로 간다.
// "다시 조회" 는 retry(판을 서버에서 다시 읽어 그린다)다. reset 은 다시 읽지 않아 서버 오류면 같은 자리에서 또 넘어진다.
import { useEffect } from "react";
import { AdminFault } from "@/components/admin/screen/fault";

export default function AdminError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return <AdminFault kind="error" digest={error.digest} onRetry={retry} />;
}
