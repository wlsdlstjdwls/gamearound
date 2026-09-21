// 관리자 영역 공통 레이아웃. proxy 가드만 믿지 않고 여기서도 role 검사(§6). 페이지는 requireRoleOrForbid(), Server Action은 requireAdmin()으로 각각 재검증.
//
// 메뉴의 "남은 일" 수는 **기다리지 않고** 약속째로 넘긴다. 이 레이아웃은 관리자 화면 전부의 길목이라,
// 여기서 한 번 await 하면 그 비용이 모든 화면에 붙는다(회사 검수 수는 games 전수 훑기다).
import { AdminNav } from "@/components/admin/admin-nav";
import { Page } from "@/components/ui/page";
import { requireRoleOrForbid } from "@/server/auth/guards";
import { getAdminWorkCounts } from "@/server/services/admin-workload";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRoleOrForbid("admin");
  // 배지가 못 떠도 화면은 살아 있어야 한다 — 숫자는 거들 뿐이고 검수는 각 화면에서 한다
  const counts = getAdminWorkCounts().catch(() => null);

  return (
    <Page gap={22}>
      <AdminNav user={user.displayName ?? user.email} counts={counts} />
      {children}
    </Page>
  );
}
