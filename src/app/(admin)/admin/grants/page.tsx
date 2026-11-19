// /admin/grants — 프로그램별사용자권한관리(2026-11-19). 프로그램마다 관리자 계정별 단추 권한(사용, 입력, 저장, 삭제, 엑셀). 화면은 components/admin/grants.
// 계정마다 쓸 프로그램만 고르는 화면은 /admin/user-programs(사용자별프로그램관리)다 — 같은 표를 축만 바꿔 본다.
// 여기는 관리자 계정과 DB 에 있는 권한 줄만 읽어 넘긴다. 프로그램 목록(메뉴 칸)은 클라이언트 파일(admin-nav-items)에 있어 화면이 합친다(AGENTS §6).
import type { Metadata } from "next";
import { ProgramUsersScreen } from "@/components/admin/grants/program-users-screen";
import { ADMIN_NAV } from "@/lib/admin/messages";
import { ROUTES } from "@/lib/routes";
import { listAdminAccounts, listGrantRowsByUser, requireProgramPage } from "@/server/services/admin-grants";

export const metadata: Metadata = { title: ADMIN_NAV.grants };

export default async function AdminGrantsPage() {
  const me = await requireProgramPage(ROUTES.adminGrants);
  const [accounts, rows] = await Promise.all([listAdminAccounts(), listGrantRowsByUser()]);
  return <ProgramUsersScreen accounts={accounts} rows={rows} meId={me.id} />;
}
