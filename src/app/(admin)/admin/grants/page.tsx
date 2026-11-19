// /admin/grants — 사용자별프로그램권한관리(2026-11-19, 사용자 "사용자별프로그램권한 관리할 수 있는 화면"). 화면은 components/admin/grants-screen.
// 여기는 관리자 계정과 DB 에 있는 권한 줄만 읽어 넘긴다. 프로그램 목록(메뉴 칸)은 클라이언트 파일(admin-nav-items)에 있어 화면이 합친다(AGENTS §6).
import type { Metadata } from "next";
import { GrantsScreen } from "@/components/admin/grants-screen";
import { ADMIN_NAV } from "@/lib/admin/messages";
import { ROUTES } from "@/lib/routes";
import { listAdminAccounts, listGrantRowsByUser, requireProgramPage } from "@/server/services/admin-grants";

export const metadata: Metadata = { title: ADMIN_NAV.grants };

export default async function AdminGrantsPage() {
  const me = await requireProgramPage(ROUTES.adminGrants);
  const [accounts, rows] = await Promise.all([listAdminAccounts(), listGrantRowsByUser()]);
  return <GrantsScreen accounts={accounts} rows={rows} meId={me.id} />;
}
