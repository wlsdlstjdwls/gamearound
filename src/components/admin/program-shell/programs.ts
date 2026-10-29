// 주소 -> 프로그램(메뉴 칸 하나). 탭 하나가 프로그램 하나다 — 같은 프로그램 안에서 조건을 바꾸거나 하위 주소로 가도 탭은 늘지 않는다.
import { ITEMS, isActive } from "@/components/admin/admin-nav-items";
import { GAME_ADMIN_MESSAGES } from "@/lib/admin/messages";
import { ROUTES } from "@/lib/routes";

export type Program = { key: string; label: string };

/** 메뉴 칸 중 가장 긴 주소가 이긴다. 메뉴에 없는 화면(게임 고치기)은 그 주소가 곧 프로그램이다 */
export function programOf(pathname: string): Program {
  const item = ITEMS.filter((i) => isActive(pathname, i.href)).sort((a, b) => b.href.length - a.href.length)[0];
  if (item) return { key: item.href, label: item.label };
  return { key: pathname, label: pathname.startsWith(`${ROUTES.admin}/games/`) ? GAME_ADMIN_MESSAGES.title : pathname };
}

/** 관리 화면 주소인가. 탭으로 여는 대상은 이것뿐이다(서비스 화면, 바깥 링크는 평소대로 간다) */
export function isAdminPath(pathname: string): boolean {
  return pathname === ROUTES.admin || pathname.startsWith(`${ROUTES.admin}/`) || pathname === ROUTES.shopsAdmin || pathname.startsWith(`${ROUTES.shopsAdmin}/`);
}
