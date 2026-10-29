// /admin/data-issues — 데이터오류관리(sync/quality). 기계가 찾은 카탈로그 문제 중 사람이 볼 것과, 기계가 이미 고친 기록.
//
// 자동 고침 기록을 같은 화면에 두는 이유: 기계가 틀리게 고쳤을 때 알아챌 자리가 여기뿐이다.
// 틀린 고침은 게임 관리 화면(/admin/games)에서 되돌린다 — 그 칸은 잠겨 있어 되돌린 값도 수집이 덮지 않는다.
//
// 화면 구성은 백오피스 승인 화면 꼴(components/admin/data-issues-screen). 여기는 읽어서 넘기기만 한다.
import type { Metadata } from "next";
import { AdminScreenHead } from "@/components/admin/screen/head";
import { DataIssuesScreen } from "@/components/admin/data-issues-screen";
import { ADMIN_NAV } from "@/lib/admin/messages";
import { requireRoleOrForbid } from "@/server/auth/guards";
import { listDataIssues } from "@/server/services/admin-data-issues";

export const metadata: Metadata = { title: ADMIN_NAV.dataIssues };

export default async function AdminDataIssuesPage() {
  await requireRoleOrForbid("admin");
  const { open, recentAuto } = await listDataIssues();

  return (
    <>
      <AdminScreenHead title={ADMIN_NAV.dataIssues} count={open.length} />
      <DataIssuesScreen open={open} recentAuto={recentAuto} />
    </>
  );
}
