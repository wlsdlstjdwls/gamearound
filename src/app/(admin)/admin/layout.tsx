// 관리자 영역 공통 레이아웃. proxy 가드만 믿지 않고 여기서도 role 검사(§6). 페이지는 requireRoleOrForbid(), Server Action은 requireAdmin()으로 각각 재검증.
//
// 껍데기는 **왼쪽 기둥 + 본문** 두 칸이다(2026-09-21, smokespot 관리자 콘솔 구조를 따랐다).
// 머리 위 한 줄이던 메뉴는 칸이 늘수록 하나하나가 좁아졌다 — 관리자 화면은 축이 붙을 때마다
// 검수 자리가 하나씩 는 자리라, 늘어도 칸 폭이 변하지 않는 구조여야 했다(admin-nav 주석).
// 좁은 화면에서는 기둥이 서지 않고 메뉴가 본문 위 한 줄로 눕는다.
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

  // 관리자만 1440(width="wide")을 쓴다(2026-09-22). 표와 판이 주인공인 화면이라 칸 수가 폭을 정한다 —
  // 1200 에서는 매칭 대기의 제목 칸이 잘리고 할 일 판의 칸 넷이 카드 글자보다 좁아졌다
  return (
    <Page width="wide" gap={18}>
      {/* items-start: 기둥이 본문 높이를 따라 늘어나면 sticky 가 걸리지 않는다 */}
      <div className="flex flex-col items-start gap-5 md:flex-row md:gap-8">
        <AdminNav user={user.displayName ?? user.email} counts={counts} />
        <main className="flex min-w-0 flex-1 flex-col gap-[22px]">{children}</main>
      </div>
    </Page>
  );
}
