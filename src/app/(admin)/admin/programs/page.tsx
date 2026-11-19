// /admin/programs — 프로그램관리(2026-11-19, 사용자 "어드민 화면 프로그램 노출 사용 여부 관리하는 화면"). 화면은 components/admin/programs-screen.
// 여기는 DB 에 덮어쓴 줄만 읽어 넘긴다. 프로그램 목록(메뉴 칸)은 클라이언트 파일(admin-nav-items)에 있어 화면이 합친다 —
// 서버 컴포넌트가 "use client" 파일의 값을 가져오면 값이 아니라 클라이언트 참조가 온다(AGENTS §6).
import type { Metadata } from "next";
import { ProgramsScreen } from "@/components/admin/programs-screen";
import { ADMIN_NAV } from "@/lib/admin/messages";
import { requireRoleOrForbid } from "@/server/auth/guards";
import { listProgramSettingRows } from "@/server/services/admin-programs";

export const metadata: Metadata = { title: ADMIN_NAV.programs };

export default async function AdminProgramsPage() {
  await requireRoleOrForbid("admin");
  return <ProgramsScreen settings={await listProgramSettingRows()} />;
}
