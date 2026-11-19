// /admin/user-programs — 사용자별프로그램관리(2026-11-19, 사용자 "화면이 보이냐 마냐, 접속 가능하냐 마냐"). 계정마다 쓸 프로그램을 켜고 끈다.
// 단추 권한(입력, 저장, 삭제, 엑셀)은 /admin/grants(프로그램별사용자권한관리)에서 준다. 화면은 components/admin/grants.
import type { Metadata } from "next";
import { UserProgramsScreen } from "@/components/admin/grants/user-programs-screen";
import { ADMIN_NAV } from "@/lib/admin/messages";
import { ROUTES } from "@/lib/routes";
import { listAdminAccounts, listGrantRowsByUser, requireProgramPage } from "@/server/services/admin-grants";

export const metadata: Metadata = { title: ADMIN_NAV.userPrograms };

export default async function AdminUserProgramsPage() {
  const me = await requireProgramPage(ROUTES.adminUserPrograms);
  const [accounts, rows] = await Promise.all([listAdminAccounts(), listGrantRowsByUser()]);
  return <UserProgramsScreen accounts={accounts} rows={rows} meId={me.id} />;
}
