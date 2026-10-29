// 관리자 영역 공통 레이아웃. proxy 가드만 믿지 않고 여기서도 role 검사(§6). 페이지는 requireRoleOrForbid(), Server Action은 requireAdmin()으로 각각 재검증.
//
// 라우트 그룹 `(admin)` 에 둔다 — `/admin/*` 뿐 아니라 `/shops/admin`(입점 신청)도 같은 껍데기를 써야 한다.
// `(admin)/admin` 에 있을 때는 메뉴에서 입점 신청을 누르면 기둥과 흰 판이 통째로 사라졌다(2026-10-08).
//
// 껍데기는 **왼쪽 기둥 + 본문** 두 칸이다(2026-09-21, smokespot 관리자 콘솔 구조를 따랐다). 2026-10-29 기둥을 화면 왼쪽 끝에 붙이고 접히게 했다.
// 머리 위 한 줄이던 메뉴는 칸이 늘수록 하나하나가 좁아졌다 — 관리자 화면은 축이 붙을 때마다
// 검수 자리가 하나씩 는 자리라, 늘어도 칸 폭이 변하지 않는 구조여야 했다(admin-nav 주석).
// 좁은 화면에서는 기둥이 서지 않고 메뉴가 본문 위 한 줄로 눕는다.
//
// 메뉴의 "남은 일" 수는 **기다리지 않고** 약속째로 넘긴다. 이 레이아웃은 관리자 화면 전부의 길목이라,
// 여기서 한 번 await 하면 그 비용이 모든 화면에 붙는다(회사 검수 수는 games 전수 훑기다).
import { AdminNav } from "@/components/admin/admin-nav";
import { cookies } from "next/headers";
import { raisedClass } from "@/components/ui/page";
import { ADMIN_GROUPS_COOKIE, ADMIN_RAIL_COOKIE } from "@/lib/admin/rail";
import { requireRoleOrForbid } from "@/server/auth/guards";
import { getAdminWorkCounts } from "@/server/services/admin-workload";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireRoleOrForbid("admin");
  // 배지가 못 떠도 화면은 살아 있어야 한다 — 숫자는 거들 뿐이고 검수는 각 화면에서 한다
  const counts = getAdminWorkCounts().catch(() => null);

  const jar = await cookies();
  const collapsed = jar.get(ADMIN_RAIL_COOKIE)?.value === "1";
  const folded = decodeURIComponent(jar.get(ADMIN_GROUPS_COOKIE)?.value ?? "").split(",").filter(Boolean);

  // 2026-10-29(사용자 "왼쪽 메뉴를 왼쪽에 붙이고 접었다 펼 수 있게, 공간 활용"): 가운데 1440 폭 안에 기둥과 본문을 띄우던 Page 를 걷었다.
  // 기둥은 화면 왼쪽 끝에 붙고(admin-rail), 본문은 남은 폭을 다 쓴다 — 표와 판이 주인공인 화면이라 폭이 곧 칸 수다.
  // 너무 넓은 화면에서 줄이 끝없이 늘지 않게 본문만 1600 에서 멈춘다.
  // 같은 날 넓은 화면에서는 사이트 머리띠도 걷었다(admin-rail 머리 주석, globals.css 의 data-admin-rail).
  return (
    <div className="flex md:items-start">
      <AdminNav counts={counts} initialCollapsed={collapsed} initialFolded={folded} />
      {/* main 이 아니라 div 인 이유: 루트 레이아웃이 이미 <main> 안에 children 을 넣는다.
          landmark 를 겹쳐 두면 낭독기가 "본문" 을 둘로 센다.

          본문을 흰 판 한 장에 올린다(2026-09-30, 사용자: "배경색이랑 컨텐츠들이 색상이 비슷해서 구분이 안 간다").
          관리자 화면의 면(Panel, 빈 칸 안내, 할 일 칸)은 전부 --surface-2 라 바탕과 녹는다 — 여기 한 곳에서 흰 판을 깐다.

          바닥 띠가 fixed 라 이 칸이 화면 높이를 붙들 이유는 없다 — 띠 자리는 globals.css 가
          문서 바닥에 비운다(`body:has([data-admin-tabbar])`). */}
      <div className="page-enter min-w-0 flex-1 px-4 pb-6 pt-4 sm:px-6 md:pb-12 lg:px-7">
        <div className={raisedClass("mx-auto flex w-full max-w-[1600px] min-w-0 flex-col gap-4 p-4 sm:p-5")}>{children}</div>
      </div>
    </div>
  );
}
