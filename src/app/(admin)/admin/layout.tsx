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
import { Page, raisedClass, sectionCardClass } from "@/components/ui/page";
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
    <Page width="wide" pad="admin" gap={18}>
      {/* md:items-start: 기둥이 본문 높이를 따라 늘어나면 sticky 가 걸리지 않는다.
          좁은 화면까지 걸면 안 된다 — 세로로 쌓인 flex 에서 items-start 는 가로 stretch 를 꺼서
          본문이 제 내용 폭으로 쪼그라든다(표와 격자가 화면을 다 쓰지 못한다).

          바닥 띠가 fixed 라 이 칸이 화면 높이를 붙들 이유는 없다 — 띠 자리는 globals.css 가
          문서 바닥에 비운다(`body:has([data-admin-tabbar])`). */}
      <div className="flex flex-col gap-5 md:flex-row md:items-start md:gap-8">
        <AdminNav user={user.displayName ?? user.email} counts={counts} className={raisedClass("md:p-3")} />
        {/* main 이 아니라 div 인 이유: 루트 레이아웃이 이미 <main> 안에 children 을 넣는다.
            landmark 를 겹쳐 두면 낭독기가 "본문" 을 둘로 센다.

            본문을 흰 판 한 장에 올린다(2026-09-30, 사용자: "배경색이랑 컨텐츠들이 색상이 비슷해서 구분이 안 간다").
            관리자 화면의 면(Panel, 빈 칸 안내, 할 일 칸)은 전부 --surface-2(#eef0f3)인데 바탕이 #f2f4f6 이라
            둘의 차이가 1% 남짓이었다 — 판이 바탕에 녹아 무엇이 한 덩어리인지 안 보였다.
            화면마다 판을 새로 두르지 않고 여기 한 곳에서 흰 판을 깐다. 그러면 안쪽의 회색 면은 흰 판 위에서
            제 모양이 서고(서비스 상세의 마디 카드와 같은 짝이다), 관리자 화면이 늘어도 따로 손댈 일이 없다 */}
        <div className={sectionCardClass("flex min-w-0 flex-1 flex-col gap-[22px]")}>{children}</div>
      </div>
    </Page>
  );
}
