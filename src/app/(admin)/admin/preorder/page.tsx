// /admin/preorder — 예약특전관리. 수집이 게임을 못 이었거나 특전을 못 뽑은 글이 "검토 대기" 로 먼저 선다.
//
// 공개 글도 같이 보여 준다 — 잘못 이어진 글(엉뚱한 게임에 붙은 특전)을 숨길 자리가 여기뿐이다.
// 화면 구성은 백오피스 승인 화면 꼴(components/admin/preorder-screen). 여기는 읽어서 넘기기만 한다.
import type { Metadata } from "next";
import { AdminScreenHead } from "@/components/admin/screen/head";
import { PreorderScreen } from "@/components/admin/preorder-screen";
import { ADMIN_NAV } from "@/lib/admin/messages";
import { requireRoleOrForbid } from "@/server/auth/guards";
import { listPreorderForAdmin } from "@/server/services/preorder-bonuses";

export const metadata: Metadata = { title: ADMIN_NAV.preorder };

export default async function AdminPreorderPage() {
  await requireRoleOrForbid("admin");
  const rows = await listPreorderForAdmin();

  return (
    <>
      <AdminScreenHead title={ADMIN_NAV.preorder} count={rows.filter((r) => r.status === "review").length} />
      <PreorderScreen rows={rows} />
    </>
  );
}
