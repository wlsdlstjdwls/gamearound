// 관리자 즐겨찾기 주소 규칙. 서버 액션의 검사와 화면이 같은 값을 본다.
// 메뉴 표(admin-nav-items)는 "use client" 파일이라 서버가 그 목록으로 거를 수 없다 — 그래서 모양으로만 거른다.
// 모르는 주소가 들어와도 화면은 메뉴 표에 있는 칸만 그리므로 드러나지 않는다.

// 대시보드는 기둥 맨 위에 늘 서 있어 담을 까닭이 없다(2026-11-02 사용자 "대시보드는 즐겨찾기 필요없을듯").
// 예전에 담긴 행이 있어도 목록에서 거른다 — 그래서 지우는 이관을 따로 두지 않는다.
import { ROUTES } from "@/lib/routes";

export const ADMIN_FAVORITE_HREF = {
  /** 관리 화면 주소 꼴(/admin, /admin/sync-logs, /shops/admin). 조회조건(?), 조각(#)은 받지 않는다 — 칸은 프로그램 하나다 */
  pattern: /^\/(admin|shops\/admin)(\/[a-z0-9-]+)*$/,
  /** 메뉴 주소 중 가장 긴 것이 30자 남짓이다. 넉넉히 잡되 아무 글이나 쌓이지 않게 막는다 */
  maxLength: 120,
} as const;

/** 최근 연 화면을 몇 개까지 기억하나. 메뉴 검색 판 빈 상태에서 즐겨찾기 아래에 선다 — 한 화면에 다 보이는 수 */
/** 별을 달 수 있는 주소인가. 모양 검사 + 대시보드 제외. 서버 액션, 화면 머리, 목록이 같이 본다 */
export function isFavoriteHref(href: string): boolean {
  return href.length <= ADMIN_FAVORITE_HREF.maxLength && ADMIN_FAVORITE_HREF.pattern.test(href) && href !== ROUTES.admin;
}

export const ADMIN_RECENT_MAX = 5;
/** 최근 연 화면은 이 기기에만 둔다(localStorage). 즐겨찾기와 달리 고른 것이 아니라 지나간 자취라 계정에 남길 까닭이 없다 */
export const ADMIN_RECENT_STORAGE_KEY = "admin-menu-recent";
