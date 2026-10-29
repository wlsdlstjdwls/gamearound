// /admin/companies — 회사정보관리. 수집이 주워 온 회사 이름 가운데 확정 못 한 것(확정 대기)과 이미 붙은 회사(등록된 회사).
//
// 자동 확정은 이름이 정확히 일치하는 회사가 위키데이터에 딱 하나일 때만 한다. 확정 대기 이름은
// 후보가 0건이거나 2건 이상이어서 배치가 판단을 미룬 것들이다. 사람이 보고 다시 조회한다.
// 확정 대기는 게임 수 순이다(2026-09-30) — 최근 수정 순이던 때는 게임 2개짜리 이름이 앞에 서고 큰 이름이 잘 안 떴다.
//
// 화면 구성은 백오피스 조회 화면 꼴(components/admin/companies-screen). 여기는 두 묶음을 읽어 넘기기만 한다.
import type { Metadata } from "next";
import { AdminScreenHead } from "@/components/admin/screen/head";
import { CompaniesScreen } from "@/components/admin/companies-screen";
import { ADMIN_NAV } from "@/lib/admin/messages";
import { requireRoleOrForbid } from "@/server/auth/guards";
import { listCompaniesForAdmin, listPendingCompanies } from "@/server/services/admin-companies";

export const metadata: Metadata = { title: ADMIN_NAV.companies };

export default async function AdminCompaniesPage() {
  await requireRoleOrForbid("admin");
  const [pending, known] = await Promise.all([listPendingCompanies(), listCompaniesForAdmin()]);

  return (
    <>
      <AdminScreenHead title={ADMIN_NAV.companies} count={pending.length} />
      <CompaniesScreen pending={pending} known={known} />
    </>
  );
}
