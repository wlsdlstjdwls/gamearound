// 관리자 화면 안의 404 — notFound() 와 없는 관리 주소(옆 [...missing] 이 notFound 를 던진다).
// 회원 404(app/not-found)는 검색, 게임 목록, 홈을 권한다. 여기는 메뉴가 그대로 선 관리자 판 안에서 시스템 메시지로 말한다(admin/screen/fault).
import type { Metadata } from "next";
import { AdminFault } from "@/components/admin/screen/fault";
import { ADMIN_FAULT_MESSAGES as M } from "@/lib/admin/messages";

export const metadata: Metadata = { title: M.notFoundTitle, robots: { index: false } };

export default function AdminNotFound() {
  return <AdminFault kind="not-found" />;
}
